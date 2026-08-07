import { Worker } from 'bullmq';
import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import redis from '../config/redis.js';
import prisma from '../config/database.js';
import { QUEUE_NAMES } from '../utils/constants.js';

// Queue with repeatable job (every 60 seconds)
export const gpsFlushQueue = new Queue(QUEUE_NAMES.GPS_FLUSH, {
  connection: createRedisConnection(),
});


export const initGpsFlushJob = async () => {
  const intervalMs = (parseInt(process.env.GPS_FLUSH_INTERVAL_SEC) || 60) * 1000;

  // BullMQ v5+ Job Scheduler API
  if (typeof gpsFlushQueue.upsertJobScheduler === 'function') {
    await gpsFlushQueue.upsertJobScheduler(
      'gps-flush-job',
      { every: intervalMs },
      {
        name: 'flush',
        data: {},
        opts: {
          removeOnComplete: { count: 5 },
          removeOnFail: { count: 5 },
        },
      }
    );
  } else if (typeof gpsFlushQueue.getRepeatableJobs === 'function') {
    const existing = await gpsFlushQueue.getRepeatableJobs();
    for (const job of existing) {
      await gpsFlushQueue.removeRepeatableByKey(job.key);
    }
    await gpsFlushQueue.add(
      'flush',
      {},
      {
        repeat: { every: intervalMs },
        removeOnComplete: { count: 5 },
        removeOnFail: { count: 5 },
      }
    );
  }

  console.log('🛰️  GPS flush repeatable job initialized');
};

// Worker
const gpsFlushWorker = new Worker(
  QUEUE_NAMES.GPS_FLUSH,
  async () => {
    // Scan for all gps-buffer:* keys
    let cursor = '0';
    let totalFlushed = 0;
    const BATCH_SIZE = 500;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'gps-buffer:*', 'COUNT', 100);
      cursor = nextCursor;

      for (const key of keys) {
        // Atomic read + delete using MULTI/EXEC
        const pipeline = redis.multi();
        pipeline.lrange(key, 0, -1);
        pipeline.del(key);
        const results = await pipeline.exec();

        const records = results[0][1]; // [error, result]
        if (!records || records.length === 0) continue;

        // Parse and batch insert
        const locationData = records.map((record) => {
          const parsed = JSON.parse(record);
          return {
            driverId: parsed.driverId,
            orderId: parsed.orderId || null,
            latitude: parsed.lat,
            longitude: parsed.lng,
            speed: parsed.speed || null,
            heading: parsed.heading || null,
            createdAt: new Date(parsed.timestamp),
          };
        });

        // Chunk if too many records
        for (let i = 0; i < locationData.length; i += BATCH_SIZE) {
          const chunk = locationData.slice(i, i + BATCH_SIZE);
          await prisma.driverLocationHistory.createMany({
            data: chunk,
          });
        }

        totalFlushed += locationData.length;
      }
    } while (cursor !== '0');

    if (totalFlushed > 0) {
      console.log(`🛰️  GPS flush: ${totalFlushed} records written to PostgreSQL`);
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 1, // Only 1 flush at a time
  }
);

gpsFlushWorker.on('failed', (job, err) => {
  console.error('❌ GPS flush failed:', err.message);
});

export default gpsFlushWorker;
