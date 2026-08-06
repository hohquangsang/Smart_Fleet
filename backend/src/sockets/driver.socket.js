import redis from '../config/redis.js';
import prisma from '../config/database.js';
import { acquireOrderLock, releaseLock } from '../services/redlock.service.js';
import { REDIS_KEYS, DRIVER_STATUS, ORDER_STATUS, APPROVAL_STATUS } from '../utils/constants.js';
import { getIO } from '../config/socket.js';
import { invoiceQueue } from '../queues/invoice.worker.js';

/**
 * Setup driver namespace socket handlers.
 * Handles: go-online, go-offline, location-update, accept-order
 */
export const setupDriverSocket = (driverNamespace) => {
  driverNamespace.on('connection', async (socket) => {
    const { id: userId, role } = socket.user;

    if (role !== 'DRIVER') {
      socket.disconnect(true);
      return;
    }

    // Join a room for this user (for targeted dispatch)
    socket.join(`user:${userId}`);
    console.log(`🚗 Driver connected: ${userId}`);

    // Get driver ID
    const driver = await prisma.driver.findUnique({
      where: { userId },
      select: { id: true, approvalStatus: true },
    });

    if (!driver) {
      socket.emit('error', { message: 'Driver profile not found' });
      socket.disconnect(true);
      return;
    }

    const driverId = driver.id;

    // ─── Go Online ─────────────────────────────
    socket.on('go-online', async ({ lat, lng }) => {
      if (driver.approvalStatus !== APPROVAL_STATUS.APPROVED) {
        socket.emit('error', { message: 'Account not approved yet' });
        return;
      }

      await redis.geoadd(REDIS_KEYS.DRIVER_LOCATIONS, lng, lat, driverId);
      await redis.hset(REDIS_KEYS.DRIVER_LOCATION(driverId), {
        lat: lat.toString(),
        lng: lng.toString(),
        speed: '0',
        heading: '0',
        updatedAt: new Date().toISOString(),
      });
      await redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), DRIVER_STATUS.ONLINE);

      socket.emit('status-changed', { status: DRIVER_STATUS.ONLINE });
      console.log(`🟢 Driver ${driverId} is ONLINE at ${lat},${lng}`);
    });

    // ─── Go Offline ────────────────────────────
    socket.on('go-offline', async () => {
      await redis.zrem(REDIS_KEYS.DRIVER_LOCATIONS, driverId);
      await redis.del(REDIS_KEYS.DRIVER_LOCATION(driverId));
      await redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), DRIVER_STATUS.OFFLINE);

      socket.emit('status-changed', { status: DRIVER_STATUS.OFFLINE });
      console.log(`🔴 Driver ${driverId} is OFFLINE`);
    });

    // ─── Location Update ───────────────────────
    socket.on('location-update', async ({ lat, lng, speed, heading, orderId }) => {
      // Update Redis GEO
      await redis.geoadd(REDIS_KEYS.DRIVER_LOCATIONS, lng, lat, driverId);

      // Update location hash
      await redis.hset(REDIS_KEYS.DRIVER_LOCATION(driverId), {
        lat: lat.toString(),
        lng: lng.toString(),
        speed: (speed || 0).toString(),
        heading: (heading || 0).toString(),
        updatedAt: new Date().toISOString(),
      });

      // Buffer for GPS flush worker
      await redis.rpush(
        REDIS_KEYS.GPS_BUFFER(driverId),
        JSON.stringify({
          driverId,
          orderId: orderId || null,
          lat,
          lng,
          speed,
          heading,
          timestamp: new Date().toISOString(),
        })
      );

      // Broadcast to customer tracking this order
      if (orderId) {
        const io = getIO();
        const customerNamespace = io.of('/customer');
        customerNamespace.to(`order:${orderId}`).emit('driver-location', {
          lat, lng, speed, heading, driverId,
        });
      }

      // Broadcast to admin fleet monitor
      const io = getIO();
      const adminNamespace = io.of('/admin');
      adminNamespace.emit('fleet-location-update', {
        driverId, lat, lng, speed, heading,
      });
    });

    // ─── Accept Order ──────────────────────────
    socket.on('accept-order', async ({ orderId }) => {
      console.log(`🤝 Driver ${driverId} attempting to accept order ${orderId}`);

      // Try to acquire distributed lock
      const lock = await acquireOrderLock(orderId);

      if (!lock) {
        socket.emit('order-taken', {
          orderId,
          message: 'This order has already been accepted by another driver',
        });
        return;
      }

      try {
        // Verify order is still PENDING
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order || order.status !== ORDER_STATUS.PENDING) {
          socket.emit('order-taken', { orderId, message: 'Order is no longer available' });
          return;
        }

        // Update order: PENDING → MATCHED
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: ORDER_STATUS.MATCHED,
            driverId,
          },
        });

        // Set driver status to on-trip
        await redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), DRIVER_STATUS.ON_TRIP);

        // Notify this driver: confirmed
        const driverUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { fullName: true, phoneNumber: true },
        });

        socket.emit('order-confirmed', {
          orderId,
          order: {
            ...order,
            status: ORDER_STATUS.MATCHED,
          },
        });

        // Notify customer: matched
        const io = getIO();
        const customerNamespace = io.of('/customer');
        customerNamespace.to(`user:${order.customerId}`).emit('order-matched', {
          orderId,
          driver: {
            id: driverId,
            name: driverUser?.fullName,
            phone: driverUser?.phoneNumber,
          },
        });

        console.log(`✅ Order ${orderId} matched to driver ${driverId}`);
      } finally {
        await releaseLock(lock);
      }
    });

    // ─── Disconnect ────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🚗 Driver disconnected: ${userId}`);
    });
  });
};
