import redis from '../config/redis.js';
import prisma from '../config/database.js';
import { acquireOrderLock, releaseLock } from '../services/redlock.service.js';
import { REDIS_KEYS, DRIVER_STATUS, ORDER_STATUS, APPROVAL_STATUS, ACTOR_TYPE } from '../utils/constants.js';
import { getIO } from '../config/socket.js';
import { invoiceQueue } from '../queues/invoice.worker.js';
import { transitionOrderStatus } from '../modules/order/order-status.service.js';
import { emitCustomerOrderStatus, emitAdminDriverAccepted, emitDriverOrderTaken, emitAdminOrderStatusUpdate } from './socket.gateway.js';
import { clearDispatchDeadline } from '../modules/order/dispatch.service.js';

import { registerOnlineDriver, unregisterOnlineDriver } from '../modules/order/dispatch.service.js';

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

    // Join user room (general) — driver-specific room joined after DB query
    socket.join(`user:${userId}`);
    console.log(`🚗 Driver connected: ${userId}`);

    // Get driver ID & info
    const driver = await prisma.driver.findUnique({
      where: { userId },
      select: {
        id: true,
        approvalStatus: true,
        vehicleType: true,
        licensePlate: true,
        rating: true,
        user: {
          select: {
            fullName: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!driver) {
      socket.emit('error', { message: 'Driver profile not found' });
      socket.disconnect(true);
      return;
    }

    const driverId = driver.id;

    // Join driver-specific room now that driverId is available (for targeted dispatch)
    socket.join(`driver:${driverId}`);
    console.log(`🚗 Driver ${driverId} joined room driver:${driverId}`);

    // If driver is active in DB and approved, auto-join online rooms on socket connection/reconnect
    if (driver.isActive && driver.approvalStatus === APPROVAL_STATUS.APPROVED) {
      socket.join('drivers:online');
      socket.join(`drivers:online:${driver.vehicleType || 'motorcycle'}`);
      await registerOnlineDriver(driverId, driver.vehicleType || 'motorcycle').catch(() => {});
      await redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), DRIVER_STATUS.ONLINE).catch(() => {});
      console.log(`🟢 Driver ${driverId} auto-joined drivers:online room on socket connection`);
    }

    // ─── Go Online ─────────────────────────────
    socket.on('go-online', async ({ lat, lng }) => {
      if (driver.approvalStatus !== APPROVAL_STATUS.APPROVED) {
        socket.emit('error', { message: 'Account not approved yet' });
        return;
      }

      socket.join('drivers:online');
      socket.join(`drivers:online:${driver.vehicleType || 'motorcycle'}`);

      await redis.geoadd(REDIS_KEYS.DRIVER_LOCATIONS, lng, lat, driverId);
      await redis.hset(REDIS_KEYS.DRIVER_LOCATION(driverId), {
        lat: lat.toString(),
        lng: lng.toString(),
        speed: '0',
        heading: '0',
        updatedAt: new Date().toISOString(),
      });
      await redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), DRIVER_STATUS.ONLINE);

      // Register driver in online Redis set for dispatching by vehicleType
      await registerOnlineDriver(driverId, driver.vehicleType || 'motorcycle');

      // Update DB active status so GET /drivers/me returns isActive: true on refresh
      await prisma.driver.update({
        where: { id: driverId },
        data: { isActive: true },
      });

      socket.emit('status-changed', { status: DRIVER_STATUS.ONLINE });
      console.log(`🟢 Driver ${driverId} is ONLINE at ${lat},${lng}`);
    });

    // ─── Go Offline ────────────────────────────
    socket.on('go-offline', async () => {
      socket.leave('drivers:online');
      socket.leave(`drivers:online:${driver.vehicleType || 'motorcycle'}`);

      await redis.zrem(REDIS_KEYS.DRIVER_LOCATIONS, driverId);
      await redis.del(REDIS_KEYS.DRIVER_LOCATION(driverId));
      await redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), DRIVER_STATUS.OFFLINE);

      // Unregister driver from online set
      await unregisterOnlineDriver(driverId, driver.vehicleType || 'motorcycle');

      // Update DB active status so GET /drivers/me returns isActive: false on refresh
      await prisma.driver.update({
        where: { id: driverId },
        data: { isActive: false },
      });

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

    // ─── Accept Order (via socket swipe) ─────────────────────
    socket.on('accept-order', async ({ orderId }) => {
      console.log(`🤝 Driver ${driverId} attempting to accept order ${orderId}`);

      // Try to acquire distributed lock (race condition protection)
      const lock = await acquireOrderLock(orderId);

      if (!lock) {
        socket.emit('order-taken', {
          orderId,
          message: 'Đơn đã được tài xế khác nhận rồi',
        });
        return;
      }

      try {
        // Verify order is still in DISPATCHING state
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            customer: { select: { id: true, fullName: true } },
          },
        });

        if (!order || order.status !== ORDER_STATUS.DISPATCHING) {
          socket.emit('order-taken', { orderId, message: 'Đơn không còn sẵn sàng để nhận' });
          return;
        }

        // Use state-machine service: DISPATCHING → IN_TRANSIT ("ĐANG GIAO")
        const updatedOrder = await transitionOrderStatus(orderId, ORDER_STATUS.IN_TRANSIT, {
          actorType: ACTOR_TYPE.DRIVER,
          actorId: driver.id,
          driverId: driver.id,
        });

        // Clear the 30s dispatch deadline
        await clearDispatchDeadline(orderId);

        // Set driver status to on-trip
        await redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), DRIVER_STATUS.ON_TRIP);

        const driverPayload = {
          id: driverId,
          name: driver?.user?.fullName || 'Tài xế SmartFleet',
          phone: driver?.user?.phoneNumber || '',
          licensePlate: driver?.licensePlate || '',
          rating: driver?.rating || 5.0,
        };

        // Notify this driver: confirmed
        socket.emit('order-confirmed', {
          orderId,
          order: updatedOrder,
          message: 'Bạn đã nhận đơn thành công! Trạng thái đơn hàng: ĐANG GIAO.',
        });

        // Notify other drivers to close dispatch bottom sheet
        emitDriverOrderTaken(orderId, driverId);

        // Notify admin: driver accepted & status is now IN_TRANSIT
        emitAdminDriverAccepted(orderId, driverPayload);
        emitAdminOrderStatusUpdate(orderId, {
          status: ORDER_STATUS.IN_TRANSIT,
          label: 'ĐANG GIAO',
          driver: driverPayload,
          totalFare: order.totalFare,
        });

        // Notify Customer: status is now IN_TRANSIT ("ĐANG GIAO")
        emitCustomerOrderStatus(order.customerId, {
          orderId,
          status: ORDER_STATUS.IN_TRANSIT,
          label: 'ĐANG GIAO',
          driver: driverPayload,
          totalFare: order.totalFare,
        });

        console.log(`Order ${orderId} IN_TRANSIT by driver ${driverId}`);
      } finally {
        await releaseLock(lock);
      }
    });

    // ─── Start Trip (Driver bắt đầu giao: MATCHED / IN_TRANSIT) ───────────
    socket.on('start-trip', async ({ orderId }) => {
      console.log(`🚀 Driver ${driverId} starting trip for order ${orderId}`);

      try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order || (order.status !== ORDER_STATUS.MATCHED && order.status !== ORDER_STATUS.IN_TRANSIT)) {
          socket.emit('error', { message: 'Đơn hàng chưa ở trạng thái có thể bắt đầu giao' });
          return;
        }

        let updatedOrder = order;
        if (order.status !== ORDER_STATUS.IN_TRANSIT) {
          // MATCHED → IN_TRANSIT
          updatedOrder = await transitionOrderStatus(orderId, ORDER_STATUS.IN_TRANSIT, {
            actorType: ACTOR_TYPE.DRIVER,
            actorId: driver.id,
          });
        }

        socket.emit('trip-started', { orderId, order: updatedOrder });

        const driverPayload = {
          id: driverId,
          name: driver?.user?.fullName || 'Tài xế SmartFleet',
          phone: driver?.user?.phoneNumber || '',
          licensePlate: driver?.licensePlate || '',
          rating: driver?.rating || 5.0,
        };

        // Notify Customer & Admin: ĐANG GIAO
        emitCustomerOrderStatus(order.customerId, {
          orderId,
          status: ORDER_STATUS.IN_TRANSIT,
          label: 'ĐANG GIAO',
          driver: driverPayload,
          totalFare: order.totalFare,
        });

        emitAdminOrderStatusUpdate(orderId, {
          status: ORDER_STATUS.IN_TRANSIT,
          label: 'ĐANG GIAO',
          driver: driverPayload,
          totalFare: order.totalFare,
        });

        console.log(`🚚 Order ${orderId} is now IN_TRANSIT`);
      } catch (err) {
        console.error('start-trip error:', err.message);
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Disconnect ────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🚗 Driver disconnected: ${userId}`);
    });
  });
};
