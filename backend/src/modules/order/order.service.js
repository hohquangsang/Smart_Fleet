import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import { getRouteWithCache } from '../../services/ors-cache.service.js';
import { predictETA } from '../../services/ai.service.js';
import { calculateFare } from '../../utils/fare-calculator.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../utils/api-error.js';
import { ORDER_STATUS, ACTOR_TYPE, REDIS_KEYS, DRIVER_STATUS } from '../../utils/constants.js';
import { transitionOrderStatus } from './order-status.service.js';
import {
  getOnlineDriverIds,
  setDispatchDeadline,
  clearDispatchDeadline,
} from './dispatch.service.js';
import {
  emitCustomerOrderStatus,
  emitAdminNewOrderRequest,
  emitDriverNewOrder,
  emitDriverOrderTaken,
  emitAdminDriverAccepted,
  emitAdminOrderStatusUpdate,
  emitDriverOrderConfirmed,
} from '../../sockets/socket.gateway.js';

/**
 * Step 1: Customer creates order (status = PENDING).
 * Emits order:status-update to customer and admin:new-order-request to Admin.
 */
export const createOrder = async (customerId, data) => {
  const { pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng, vehicleType = 'motorcycle' } = data;

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
  const fare = calculateFare(route.distanceKm, vehicleType);

  // 4. Create order in DB with status PENDING
  const order = await prisma.order.create({
    data: {
      customerId,
      status: ORDER_STATUS.PENDING,
      vehicleType,
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
    include: {
      customer: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
    },
  });

  // Log status history
  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: null,
      toStatus: ORDER_STATUS.PENDING,
      actorType: ACTOR_TYPE.CUSTOMER,
      actorId: customerId,
    },
  });

  // 5. Emit socket to Customer (source of truth) and Admin
  emitCustomerOrderStatus(customerId, {
    orderId: order.id,
    status: ORDER_STATUS.PENDING,
    label: 'Đang tìm tài xế',
    totalFare: order.totalFare,
  });

  emitAdminNewOrderRequest(order);

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
 * Step 2: Admin dispatches order to online drivers (status = DISPATCHING).
 * Sets 30s deadline TTL in Redis + BullMQ delayed job.
 */
export const dispatchOrder = async (orderId, adminUserId) => {
  const order = await getOrderById(orderId);
  if (order.status !== ORDER_STATUS.PENDING && order.status !== ORDER_STATUS.EXPIRED_NO_DRIVER) {
    throw new BadRequestError(`Cannot dispatch order with status ${order.status}`);
  }

  // Transition to DISPATCHING
  const updatedOrder = await transitionOrderStatus(orderId, ORDER_STATUS.DISPATCHING, {
    actorType: ACTOR_TYPE.ADMIN,
    actorId: adminUserId,
  });

  // Get online drivers for vehicleType
  const onlineDriverIds = await getOnlineDriverIds(order.vehicleType || 'motorcycle');

  // Emit driver:new-order offer to online drivers
  emitDriverNewOrder(onlineDriverIds, {
    orderId: order.id,
    fare: Number(order.totalFare),
    distanceKm: Number(order.distanceKm),
    etaMin: order.aiEtaMin || order.baseEtaMin,
    pickupAddress: order.pickupAddress,
    dropoffAddress: order.dropoffAddress,
    vehicleType: order.vehicleType,
    expiresInSec: 30,
  });

  // Set Redis key order:{id}:dispatch_deadline with TTL 30s
  await setDispatchDeadline(order.id, 30);

  return updatedOrder;
};

/**
 * Step 3: Driver swiping to accept order (status = DRIVER_ACCEPTED).
 * Handles race condition via Redis SET order:{id}:lock {driverId} NX EX 5.
 */
export const acceptOrder = async (orderId, driverUserId) => {
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    include: { user: { select: { fullName: true, phoneNumber: true } } },
  });

  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  const lockKey = REDIS_KEYS.ORDER_LOCK(orderId);
  // Redis NX EX 5 lock attempt
  const acquiredLock = await redis.set(lockKey, driver.id, 'NX', 'EX', 5);

  if (!acquiredLock) {
    throw new ConflictError('Đơn đã được tài xế khác nhận');
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== ORDER_STATUS.DISPATCHING) {
    throw new ConflictError('Đơn không còn sẵn sàng để nhận');
  }

  // Transition directly to IN_TRANSIT ("ĐANG GIAO") upon driver acceptance
  const updatedOrder = await transitionOrderStatus(orderId, ORDER_STATUS.IN_TRANSIT, {
    actorType: ACTOR_TYPE.DRIVER,
    actorId: driver.id,
    driverId: driver.id,
  });

  // Clear 30s dispatch deadline
  await clearDispatchDeadline(orderId);

  // Set driver status to ON_TRIP in Redis
  await redis.set(REDIS_KEYS.DRIVER_STATUS(driver.id), DRIVER_STATUS.ON_TRIP);

  const driverPayload = {
    id: driver.id,
    name: driver.user?.fullName || 'Tài xế SmartFleet',
    phone: driver.user?.phoneNumber || '',
    licensePlate: driver.licensePlate || '',
    rating: driver.rating || 5.0,
  };

  // Emit to other drivers to close dispatch bottom sheet
  emitDriverOrderTaken(orderId, driver.id);

  // Emit to Admin panel: driver accepted & status is now IN_TRANSIT
  emitAdminDriverAccepted(orderId, driverPayload);
  emitAdminOrderStatusUpdate(orderId, {
    status: ORDER_STATUS.IN_TRANSIT,
    label: 'ĐANG GIAO',
    driver: driverPayload,
    totalFare: updatedOrder.totalFare,
  });

  // Emit to Customer: status is now IN_TRANSIT ("ĐANG GIAO") with full driver details
  emitCustomerOrderStatus(updatedOrder.customerId, {
    orderId: updatedOrder.id,
    status: ORDER_STATUS.IN_TRANSIT,
    label: 'ĐANG GIAO',
    driver: driverPayload,
    totalFare: updatedOrder.totalFare,
  });

  return updatedOrder;
};

/**
 * Driver declines order offer (does not change order status).
 */
export const declineOrder = async (orderId, driverUserId) => {
  const driver = await prisma.driver.findUnique({ where: { userId: driverUserId } });
  if (driver) {
    console.log(`Driver ${driver.id} declined dispatch for order ${orderId}`);
  }
  return { success: true, message: 'Declined order offer' };
};

/**
 * Step 4: Admin confirms driver match (status = MATCHED).
 * Emits order:status-update to Customer with Driver Card details.
 */
export const confirmMatchOrder = async (orderId, adminUserId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      driver: {
        include: { user: { select: { fullName: true, phoneNumber: true } } },
      },
    },
  });

  if (!order || order.status !== ORDER_STATUS.DRIVER_ACCEPTED) {
    throw new BadRequestError('Order is not waiting for Admin confirmation');
  }

  // Transition to MATCHED
  const updatedOrder = await transitionOrderStatus(orderId, ORDER_STATUS.MATCHED, {
    actorType: ACTOR_TYPE.ADMIN,
    actorId: adminUserId,
  });

  // Emit to Customer: order:status-update
  emitCustomerOrderStatus(order.customerId, {
    orderId: order.id,
    status: ORDER_STATUS.MATCHED,
    label: 'Tài xế đang đến nhận hàng',
    driver: {
      id: order.driver?.id,
      name: order.driver?.user?.fullName || 'Nguyễn Văn Nam',
      phone: order.driver?.user?.phoneNumber || '0908123456',
      licensePlate: order.driver?.licensePlate || '51K-888.99',
      vehicleType: order.driver?.vehicleType || order.vehicleType,
      rating: order.driver?.rating || 4.9,
    },
    totalFare: order.totalFare,
  });

  // Notify Driver: admin confirmed match, bắt đầu giao
  if (order.driver) {
    emitDriverOrderConfirmed(order.driver.id, {
      orderId: order.id,
      order: updatedOrder,
      message: 'Admin đã xác nhận! Hãy đi đến lấy hàng và nhấn "Bắt đầu giao" khi xuất phát.',
    });
  }

  return updatedOrder;
};

/**
 * Step 5: Driver bắt đầu giao hàng (status = IN_TRANSIT = ĐANG GIAO).
 * Emits order:status-update "ĐANG GIAO" đến Customer.
 */
export const startTrip = async (orderId, driverUserId) => {
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
  });
  if (!driver) throw new NotFoundError('Driver profile not found');

  const order = await getOrderById(orderId);

  if (order.driverId !== driver.id) {
    throw new ForbiddenError('Bạn không phải tài xế của đơn hàng này');
  }

  if (order.status !== ORDER_STATUS.MATCHED) {
    throw new BadRequestError(`Không thể bắt đầu giao khi đơn đang ở trạng thái ${order.status}`);
  }

  // MATCHED → IN_TRANSIT
  const updatedOrder = await transitionOrderStatus(orderId, ORDER_STATUS.IN_TRANSIT, {
    actorType: ACTOR_TYPE.DRIVER,
    actorId: driver.id,
  });

  const driverPayload = {
    id: driver.id,
    name: order.driver?.user?.fullName || driver.user?.fullName || 'Tài xế SmartFleet',
    phone: order.driver?.user?.phoneNumber || driver.user?.phoneNumber || '',
    licensePlate: order.driver?.licensePlate || driver.licensePlate || '',
    rating: order.driver?.rating || driver.rating || 5.0,
  };

  // Emit to Customer & Admin: ĐANG GIAO
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

  return updatedOrder;
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
 * Cancel an order (Customer / Admin action).
 */
export const cancelOrder = async (orderId, actorUserId, actorType = ACTOR_TYPE.CUSTOMER, cancelReason = null) => {
  const order = await getOrderById(orderId);

  if (actorType === ACTOR_TYPE.CUSTOMER && order.customerId !== actorUserId) {
    throw new ForbiddenError('This is not your order');
  }

  // After MATCHED, cancelReason is required
  if (order.status === ORDER_STATUS.MATCHED && (!cancelReason || !cancelReason.trim())) {
    throw new BadRequestError('Vui lòng cung cấp lý do hủy đơn hàng');
  }

  const updatedOrder = await transitionOrderStatus(orderId, ORDER_STATUS.CANCELLED, {
    actorType,
    actorId: actorUserId,
    cancelReason,
  });

  await clearDispatchDeadline(orderId);

  emitCustomerOrderStatus(order.customerId, {
    orderId,
    status: ORDER_STATUS.CANCELLED,
    label: 'Đã hủy đơn hàng',
  });

  return updatedOrder;
};

/**
 * Get currently active DISPATCHING order for driver (if available for their vehicleType).
 */
export const getAvailableDispatchOrder = async (driverUserId) => {
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
  });

  if (!driver) return null;

  // Find latest order in DISPATCHING status for driver's vehicleType
  const activeOrder = await prisma.order.findFirst({
    where: {
      status: ORDER_STATUS.DISPATCHING,
      OR: [
        { vehicleType: { equals: driver.vehicleType || 'motorcycle', mode: 'insensitive' } },
        { vehicleType: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeOrder) return null;

  // Calculate remaining TTL from Redis
  const deadlineKey = REDIS_KEYS.DISPATCH_DEADLINE(activeOrder.id);
  const ttl = await redis.ttl(deadlineKey);
  const expiresInSec = ttl > 0 ? ttl : 30;

  return {
    orderId: activeOrder.id,
    fare: Number(activeOrder.totalFare),
    distanceKm: Number(activeOrder.distanceKm),
    etaMin: activeOrder.aiEtaMin || activeOrder.baseEtaMin,
    pickupAddress: activeOrder.pickupAddress,
    dropoffAddress: activeOrder.dropoffAddress,
    vehicleType: activeOrder.vehicleType,
    expiresInSec,
  };
};
