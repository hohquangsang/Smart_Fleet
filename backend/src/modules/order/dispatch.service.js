import redis from '../../config/redis.js';
import { orderQueue } from '../../queues/order.queue.js';
import { REDIS_KEYS } from '../../utils/constants.js';

/**
 * Register a driver as Online in Redis for their vehicleType.
 */
export const registerOnlineDriver = async (driverId, vehicleType = 'motorcycle') => {
  const key = REDIS_KEYS.DRIVERS_ONLINE_VEHICLE(vehicleType);
  await redis.sadd(key, driverId);
};

/**
 * Remove a driver from Online set in Redis.
 */
export const unregisterOnlineDriver = async (driverId, vehicleType = 'motorcycle') => {
  const key = REDIS_KEYS.DRIVERS_ONLINE_VEHICLE(vehicleType);
  await redis.srem(key, driverId);
};

/**
 * Get all online driver IDs for a specific vehicle type.
 */
export const getOnlineDriverIds = async (vehicleType = 'motorcycle') => {
  const key = REDIS_KEYS.DRIVERS_ONLINE_VEHICLE(vehicleType);
  return redis.smembers(key);
};

/**
 * Set 30s dispatch deadline TTL in Redis and add a delayed BullMQ job.
 */
export const setDispatchDeadline = async (orderId, timeoutSec = 30) => {
  const key = REDIS_KEYS.DISPATCH_DEADLINE(orderId);
  await redis.set(key, 'ACTIVE', 'EX', timeoutSec);

  // Add BullMQ delayed job for 30s
  await orderQueue.add(
    'dispatch-timeout',
    { orderId },
    {
      delay: timeoutSec * 1000,
      jobId: `dispatch-timeout-${orderId}`,
      removeOnComplete: true,
    }
  );
};

/**
 * Clear dispatch deadline TTL in Redis.
 */
export const clearDispatchDeadline = async (orderId) => {
  const key = REDIS_KEYS.DISPATCH_DEADLINE(orderId);
  await redis.del(key);
};

export default {
  registerOnlineDriver,
  unregisterOnlineDriver,
  getOnlineDriverIds,
  setDispatchDeadline,
  clearDispatchDeadline,
};
