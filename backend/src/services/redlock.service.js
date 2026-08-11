import Redlock from 'redlock';
import { createRedisConnection } from '../config/redis.js';

// Redlock needs at least 1 Redis client
const redlockClient = createRedisConnection();

const redlock = new Redlock([redlockClient], {
  // Retry settings
  driftFactor: 0.01,
  retryCount: 0, // Don't retry — if lock fails, order is already taken
  retryDelay: 200,
  retryJitter: 200,
  automaticExtensionThreshold: 500,
});

redlock.on('error', (error) => {
  // Ignore resource-locked errors (expected during concurrent accepts)
  if (error.message === 'Exceeded the maximum number of attempts to lock the resource.') {
    return;
  }
  console.error('Redlock error:', error);
});

import { REDIS_KEYS } from '../utils/constants.js';

/**
 * Acquire a lock for accepting an order.
 *
 * @param {string} orderId - The order ID to lock
 * @param {number} ttl - Lock TTL in milliseconds (default 5000ms)
 * @returns {Promise<import('redlock').Lock|null>} Lock object or null if failed
 */
export const acquireOrderLock = async (orderId, ttl = 5000) => {
  try {
    const lockKey = REDIS_KEYS.ORDER_LOCK(orderId);
    const lock = await redlock.acquire([lockKey], ttl);
    return lock;
  } catch {
    return null; // Lock not acquired — another driver got it
  }
};

/**
 * Release a lock.
 */
export const releaseLock = async (lock) => {
  try {
    await lock.release();
  } catch (error) {
    console.warn('Lock release warning:', error.message);
  }
};

export default redlock;
