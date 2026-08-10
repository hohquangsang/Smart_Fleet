import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import { NotFoundError, ForbiddenError } from '../../utils/api-error.js';
import { REDIS_KEYS, DRIVER_STATUS, APPROVAL_STATUS } from '../../utils/constants.js';

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

  return driver;
};

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
