import Redis from 'ioredis';
import env from './env.js';

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Main Redis client for general operations (cache, geo, pub/sub)
const redis = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

/**
 * Create a new Redis connection (for BullMQ workers, subscribers, etc.)
 * Each BullMQ queue/worker needs its own connection.
 */
export const createRedisConnection = () => new Redis(redisConfig);

export default redis;
