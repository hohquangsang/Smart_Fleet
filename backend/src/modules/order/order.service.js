import prisma from '../../config/database.js';
import { getRouteWithCache } from '../../services/ors-cache.service.js';
import { predictETA } from '../../services/ai.service.js';
import { calculateFare } from '../../utils/fare-calculator.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/api-error.js';
import { ORDER_STATUS } from '../../utils/constants.js';
import { orderQueue } from '../../queues/order.queue.js';

/**
 * Create a new order.
 * Flow: ORS (cached) → AI ETA → fare calc → DB insert → BullMQ dispatch
 */
export const createOrder = async (customerId, data) => {
  const { pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng } = data;

  // 1. Get route info (with caching)
  const route = await getRouteWithCache(pickupLat, pickupLng, dropoffLat, dropoffLng);

  // 2. Get AI ETA prediction (graceful fallback)
  const aiResult = await predictETA({
    distanceKm: route.distanceKm,
    baseEtaMin: route.durationMin,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  });

  // 3. Calculate fare
  const fare = calculateFare(route.distanceKm);

  // 4. Create order in DB
  const order = await prisma.order.create({
    data: {
      customerId,
      status: ORDER_STATUS.PENDING,
      pickupAddress,
      pickupLat,
      pickupLng,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      totalFare: fare.totalFare,
      distanceKm: route.distanceKm,
      baseEtaMin: route.durationMin,
      aiEtaMin: aiResult.aiEtaMin,
    },
  });

  // 5. Add to dispatch queue
  await orderQueue.add('dispatch', { orderId: order.id }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  return {
    order,
    route: {
      distanceKm: route.distanceKm,
      baseEtaMin: route.durationMin,
      aiEtaMin: aiResult.aiEtaMin,
      cached: route.cached,
    },
    fare,
  };
};

/**
 * Get orders for a customer.
 */
export const getCustomerOrders = async (customerId, { page = 1, limit = 20, status } = {}) => {
  const where = { customerId };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        driver: {
          include: {
            user: { select: { fullName: true, phoneNumber: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/**
 * Get orders for a driver.
 */
export const getDriverOrders = async (userId, { page = 1, limit = 20, status } = {}) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new NotFoundError('Driver not found');

  const where = { driverId: driver.id };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { fullName: true, phoneNumber: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/**
 * Get order by ID.
 */
export const getOrderById = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
      driver: {
        include: {
          user: { select: { fullName: true, phoneNumber: true } },
        },
      },
    },
  });

  if (!order) throw new NotFoundError('Order not found');
  return order;
};

/**
 * Update order status (Driver action).
 * Validates state transitions: MATCHED → PICKED_UP → DELIVERED
 */
export const updateOrderStatus = async (userId, orderId, newStatus) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new NotFoundError('Driver not found');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');

  if (order.driverId !== driver.id) {
    throw new ForbiddenError('This order is not assigned to you');
  }

  // Validate status transition
  const validTransitions = {
    [ORDER_STATUS.MATCHED]: [ORDER_STATUS.PICKED_UP],
    [ORDER_STATUS.PICKED_UP]: [ORDER_STATUS.DELIVERED],
  };

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot transition from ${order.status} to ${newStatus}`
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  // If DELIVERED, free up the driver
  if (newStatus === ORDER_STATUS.DELIVERED) {
    await prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: true },
    });
  }

  return updatedOrder;
};

/**
 * Cancel an order (Customer action, only PENDING orders).
 */
export const cancelOrder = async (customerId, orderId) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');

  if (order.customerId !== customerId) {
    throw new ForbiddenError('This is not your order');
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new BadRequestError('Only PENDING orders can be cancelled');
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUS.CANCELLED },
  });
};
