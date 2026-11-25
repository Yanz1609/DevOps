import Redis from 'ioredis';
import { config } from '../config.js';

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy(times) {
        const delay = Math.min(times * 500, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      console.log(`[Redis] Connected to Redis at ${config.redis.host}:${config.redis.port}`);
    });

    redisClient.on('error', (err) => {
      console.warn(`[Redis] Connection warning: ${err.message}`);
    });
  }
  return redisClient;
}

/**
 * Push a thumbnail generation job into the Redis queue
 * @param {Object} job 
 * @param {string} job.fileId
 * @param {string} job.objectKey
 * @param {string} job.mimeType
 * @param {string} job.name
 */
export async function enqueueThumbnailJob(job) {
  try {
    const client = getRedisClient();
    const payload = JSON.stringify({
      ...job,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
    });
    await client.rpush(config.redis.queueName, payload);
    console.log(`[Queue] Enqueued thumbnail job for file ${job.fileId} (${job.name})`);
    return true;
  } catch (err) {
    console.error(`[Queue] Failed to enqueue thumbnail job for file ${job.fileId}:`, err.message);
    return false;
  }
}

