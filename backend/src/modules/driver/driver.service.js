import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import { NotFoundError, ForbiddenError } from '../../utils/api-error.js';
import { REDIS_KEYS, DRIVER_STATUS, APPROVAL_STATUS, ORDER_STATUS } from '../../utils/constants.js';

/**
 * Get driver profile with user info.
 */
export const getDriverProfile = async (userId) => {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  const redisStatus = await redis.get(REDIS_KEYS.DRIVER_STATUS(driver.id));
  const isOnline = redisStatus === DRIVER_STATUS.ONLINE || driver.isActive === true;

  return {
    ...driver,
    isActive: isOnline,
    status: isOnline ? DRIVER_STATUS.ONLINE : DRIVER_STATUS.OFFLINE,
  };
};

import { registerOnlineDriver, unregisterOnlineDriver } from '../order/dispatch.service.js';

/**
 * Toggle driver online/offline status.
 * Only APPROVED drivers can go online.
 */
export const toggleStatus = async (userId, { lat, lng }) => {
  const driver = await prisma.driver.findUnique({
    where: { userId },
  });

  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  if (driver.approvalStatus !== APPROVAL_STATUS.APPROVED) {
    throw new ForbiddenError('Your account has not been approved by admin yet');
  }

  const currentStatus = await redis.get(REDIS_KEYS.DRIVER_STATUS(driver.id));
  const isGoingOnline = currentStatus !== DRIVER_STATUS.ONLINE;

  if (isGoingOnline) {
    // Go online — require coordinates
    if (lat == null || lng == null) {
      throw new ForbiddenError('Location (lat, lng) is required to go online');
    }

    // Add to Redis GEO set
    await redis.geoadd(REDIS_KEYS.DRIVER_LOCATIONS, lng, lat, driver.id);

    // Set driver location hash
    await redis.hset(REDIS_KEYS.DRIVER_LOCATION(driver.id), {
      lat: lat.toString(),
      lng: lng.toString(),
      speed: '0',
      heading: '0',
      updatedAt: new Date().toISOString(),
    });

    // Set status to online
    await redis.set(REDIS_KEYS.DRIVER_STATUS(driver.id), DRIVER_STATUS.ONLINE);

    // Register driver as online for dispatching by vehicleType
    await registerOnlineDriver(driver.id, driver.vehicleType || 'motorcycle');

    // Update DB
    await prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: true },
    });

    return { status: DRIVER_STATUS.ONLINE, driverId: driver.id };
  } else {
    // Go offline
    await redis.zrem(REDIS_KEYS.DRIVER_LOCATIONS, driver.id);
    await redis.del(REDIS_KEYS.DRIVER_LOCATION(driver.id));
    await redis.set(REDIS_KEYS.DRIVER_STATUS(driver.id), DRIVER_STATUS.OFFLINE);

    // Unregister driver from online set
    await unregisterOnlineDriver(driver.id, driver.vehicleType || 'motorcycle');

    await prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: false },
    });

    return { status: DRIVER_STATUS.OFFLINE, driverId: driver.id };
  }
};

/**
 * Accept a pending order.
 */
export const acceptOrder = async (userId, orderId) => {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: { user: { select: { fullName: true, phoneNumber: true } } },
  });

  if (!driver) throw new NotFoundError('Driver profile not found');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');
  if (order.status !== 'PENDING') {
    throw new ForbiddenError('Order is no longer available');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'MATCHED',
      driverId: driver.id,
    },
    include: {
      driver: {
        include: { user: { select: { fullName: true, phoneNumber: true } } },
      },
    },
  });

  try {
    const { getIO } = await import('../../config/socket.js');
    const io = getIO();
    io.of('/customer').emit('order-matched', {
      orderId: order.id,
      status: 'MATCHED',
      driver: {
        id: driver.id,
        name: driver.user?.fullName || 'Nguyễn Văn Nam',
        phone: driver.user?.phoneNumber || '0908123456',
        licensePlate: driver.licensePlate || '51K-888.99',
      },
    });

    io.of('/admin').emit('order-matched', {
      orderId: order.id,
      driverName: driver.user?.fullName,
    });
  } catch (err) {
    console.error('Socket emit error on acceptOrder:', err);
  }

  return updatedOrder;
};

/**
 * Get driver earnings & performance statistics for charts and history.
 */
export const getDriverEarnings = async (userId, { period = 'week' } = {}) => {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: {
      user: { select: { fullName: true, phoneNumber: true } },
    },
  });

  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  // Completed / Delivered orders for driver
  const completedOrders = await prisma.order.findMany({
    where: {
      driverId: driver.id,
      status: { in: [ORDER_STATUS.COMPLETED, ORDER_STATUS.DELIVERED] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalEarnings = completedOrders.reduce((sum, o) => sum + Number(o.totalFare || 0), 0);
  const tripsCount = completedOrders.length;
  const baseEarnings = Math.round(totalEarnings * 0.85);
  const bonusAmount = Math.round(totalEarnings * 0.15);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = completedOrders.filter((o) => new Date(o.createdAt) >= today);
  const todayEarnings = todayOrders.reduce((sum, o) => sum + Number(o.totalFare || 0), 0);
  const todayBase = Math.round(todayEarnings * 0.85);
  const todayBonus = Math.round(todayEarnings * 0.15);

  // Time-series chart bars for 'day', 'week', 'month'
  let bars = [];

  if (period === 'day') {
    const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    bars = timeSlots.map((label) => {
      const hour = parseInt(label.split(':')[0], 10);
      const ordersInSlot = todayOrders.filter((o) => {
        const h = new Date(o.createdAt).getHours();
        return h >= hour && h < hour + 2;
      });
      const fareSum = ordersInSlot.reduce((sum, o) => sum + Number(o.totalFare || 0), 0);
      return {
        label,
        base: Math.round(fareSum * 0.85),
        bonus: Math.round(fareSum * 0.15),
      };
    });
  } else if (period === 'month') {
    const weeks = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
    bars = weeks.map((label, i) => {
      const ordersInWeek = completedOrders.filter((o) => {
        const dayOfMonth = new Date(o.createdAt).getDate();
        return dayOfMonth > i * 7 && dayOfMonth <= (i + 1) * 7;
      });
      const fareSum = ordersInWeek.reduce((sum, o) => sum + Number(o.totalFare || 0), 0);
      return {
        label,
        base: Math.round(fareSum * 0.85),
        bonus: Math.round(fareSum * 0.15),
      };
    });
  } else {
    // 'week' (T2 - CN)
    const weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(now.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    bars = weekLabels.map((label, idx) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + idx);
      const nextDate = new Date(dayDate);
      nextDate.setDate(dayDate.getDate() + 1);

      const ordersOnDay = completedOrders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= dayDate && d < nextDate;
      });
      const fareSum = ordersOnDay.reduce((sum, o) => sum + Number(o.totalFare || 0), 0);
      return {
        label,
        base: Math.round(fareSum * 0.85),
        bonus: Math.round(fareSum * 0.15),
      };
    });
  }

  // All trip history for this driver
  const allDriverOrders = await prisma.order.findMany({
    where: { driverId: driver.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const history = allDriverOrders.map((o) => ({
    code: `#ORD-${o.id.slice(-8).toUpperCase()}`,
    time: new Date(o.createdAt).toLocaleString('vi-VN'),
    route: `${o.pickupAddress} ➔ ${o.dropoffAddress}`,
    fare: `${Number(o.totalFare || 0).toLocaleString('vi-VN')} đ`,
    status: o.status,
  }));

  const totalAssigned = allDriverOrders.length;
  const acceptRate = totalAssigned > 0 ? Math.round((tripsCount / totalAssigned) * 100) : 100;
  const completeRate = totalAssigned > 0 ? Math.round((tripsCount / Math.max(1, totalAssigned)) * 100) : 100;

  return {
    driver: {
      id: driver.id,
      name: driver.user?.fullName,
      phone: driver.user?.phoneNumber,
      rating: parseFloat(driver.rating || 5.0),
      licensePlate: driver.licensePlate,
      vehicleType: driver.vehicleType,
    },
    totalEarnings,
    tripsCount,
    baseEarnings,
    bonusAmount,
    todayEarnings,
    todayBase,
    todayBonus,
    todayTripsCount: todayOrders.length,
    acceptRate,
    completeRate,
    bars,
    history,
  };
};
