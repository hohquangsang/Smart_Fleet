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
