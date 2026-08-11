import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import prisma from '../config/database.js';
import { searchNearbyDrivers } from '../services/redis-geo.service.js';
import redis from '../config/redis.js';
import { getIO } from '../config/socket.js';
import { QUEUE_NAMES, DRIVER_STATUS, REDIS_KEYS, APPROVAL_STATUS, ORDER_STATUS, ACTOR_TYPE } from '../utils/constants.js';
import env from '../config/env.js';

/**
 * Order dispatch worker.
 * 1. Process 30s dispatch-timeout job -> EXPIRED_NO_DRIVER
 * 2. Process dispatch job -> GEOSEARCH nearby drivers -> emit 'new-order'
 */
const orderWorker = new Worker(
  QUEUE_NAMES.ORDER_DISPATCH,
  async (job) => {
    if (job.name === 'dispatch-timeout') {
      const { orderId } = job.data;
      console.log(`⏰ Dispatch timeout check for order: ${orderId}`);

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && order.status === ORDER_STATUS.DISPATCHING) {
        const { transitionOrderStatus } = await import('../modules/order/order-status.service.js');
        const { emitCustomerOrderStatus } = await import('../sockets/socket.gateway.js');

        await transitionOrderStatus(orderId, ORDER_STATUS.EXPIRED_NO_DRIVER, {
          actorType: ACTOR_TYPE.SYSTEM,
        });

        emitCustomerOrderStatus(order.customerId, {
          orderId,
          status: ORDER_STATUS.EXPIRED_NO_DRIVER,
          label: 'Hết thời gian tìm tài xế',
        });

        console.log(`⌛ Order ${orderId} expired with status EXPIRED_NO_DRIVER`);
      }
      return;
    }

    if (job.name === 'dispatch') {
      const { orderId } = job.data;
      console.log(`🚀 Processing dispatch for order: ${orderId}`);

      // Fetch order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: { select: { fullName: true, phoneNumber: true } },
        },
      });

      if (!order || order.status !== 'PENDING') {
        console.log(`⚠️  Order ${orderId} is no longer PENDING, skipping`);
        return;
      }

      // GEOSEARCH nearby drivers
      const nearbyDrivers = await searchNearbyDrivers(
        order.pickupLng,
        order.pickupLat,
        env.DISPATCH_RADIUS_KM
      );

      if (nearbyDrivers.length === 0) {
        console.log(`⚠️  No nearby drivers found for order ${orderId}`);
        return;
      }

      // Filter: only APPROVED, ONLINE drivers
      const eligibleDriverIds = [];
      for (const { driverId } of nearbyDrivers) {
        const status = await redis.get(REDIS_KEYS.DRIVER_STATUS(driverId));
        if (status === DRIVER_STATUS.ONLINE) {
          const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            select: { approvalStatus: true, userId: true },
          });
          if (driver && driver.approvalStatus === APPROVAL_STATUS.APPROVED) {
            eligibleDriverIds.push({ driverId, userId: driver.userId });
          }
        }
      }

      if (eligibleDriverIds.length === 0) {
        console.log(`⚠️  No eligible drivers for order ${orderId}`);
        return;
      }

      const io = getIO();
      const driverNamespace = io.of('/driver');

      const orderPayload = {
        orderId: order.id,
        pickupAddress: order.pickupAddress,
        pickupLat: order.pickupLat,
        pickupLng: order.pickupLng,
        dropoffAddress: order.dropoffAddress,
        dropoffLat: order.dropoffLat,
        dropoffLng: order.dropoffLng,
        fare: Number(order.totalFare),
        distanceKm: Number(order.distanceKm),
        baseEtaMin: order.baseEtaMin,
        etaMin: order.aiEtaMin || order.baseEtaMin,
        vehicleType: order.vehicleType,
        customer: order.customer,
        expiresInSec: 30,
      };

      for (const { driverId, userId } of eligibleDriverIds) {
        driverNamespace.to(`driver:${driverId}`).emit('driver:new-order', orderPayload);
        driverNamespace.to(`user:${userId}`).emit('driver:new-order', orderPayload);
      }

      console.log(`✅ Dispatched order ${orderId} to ${eligibleDriverIds.length} drivers`);
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 5,
  }
);

orderWorker.on('failed', (job, err) => {
  console.error(`❌ Order dispatch failed for job ${job?.id}:`, err.message);
});

export default orderWorker;
