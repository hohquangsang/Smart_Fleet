import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import prisma from '../config/database.js';
import { searchNearbyDrivers } from '../services/redis-geo.service.js';
import redis from '../config/redis.js';
import { getIO } from '../config/socket.js';
import { QUEUE_NAMES, DRIVER_STATUS, REDIS_KEYS, APPROVAL_STATUS } from '../utils/constants.js';
import env from '../config/env.js';

/**
 * Order dispatch worker.
 * 1. GEOSEARCH nearby drivers
 * 2. Filter: approved + online + not on trip
 * 3. Emit 'new-order' to matched drivers via Socket.IO
 */
const orderWorker = new Worker(
  QUEUE_NAMES.ORDER_DISPATCH,
  async (job) => {
    const { orderId } = job.data;
    console.log(`🚀 Processing dispatch for order: ${orderId}`);

    // 1. Fetch order details
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

    // 2. GEOSEARCH nearby drivers
    const nearbyDrivers = await searchNearbyDrivers(
      order.pickupLng,
      order.pickupLat,
      env.DISPATCH_RADIUS_KM
    );

    if (nearbyDrivers.length === 0) {
      console.log(`⚠️  No nearby drivers found for order ${orderId}`);
      return;
    }

    // 3. Filter: only APPROVED, ONLINE drivers
    const eligibleDriverIds = [];
    for (const { driverId } of nearbyDrivers) {
      const status = await redis.get(REDIS_KEYS.DRIVER_STATUS(driverId));
      if (status === DRIVER_STATUS.ONLINE) {
        // Verify DB approval status
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

    // 4. Emit to driver namespace
    const io = getIO();
    const driverNamespace = io.of('/driver');

    const orderPayload = {
      id: order.id,
      pickupAddress: order.pickupAddress,
      pickupLat: order.pickupLat,
      pickupLng: order.pickupLng,
      dropoffAddress: order.dropoffAddress,
      dropoffLat: order.dropoffLat,
      dropoffLng: order.dropoffLng,
      totalFare: order.totalFare,
      distanceKm: order.distanceKm,
      baseEtaMin: order.baseEtaMin,
      aiEtaMin: order.aiEtaMin,
      customer: order.customer,
    };

    for (const { userId } of eligibleDriverIds) {
      driverNamespace.to(`user:${userId}`).emit('new-order', orderPayload);
    }

    console.log(`✅ Dispatched order ${orderId} to ${eligibleDriverIds.length} drivers`);
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
