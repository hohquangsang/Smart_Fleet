import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { QUEUE_NAMES } from '../utils/constants.js';

export const orderQueue = new Queue(QUEUE_NAMES.ORDER_DISPATCH, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

console.log('📦 Order dispatch queue initialized');
