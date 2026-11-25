import dotenv from 'dotenv';
import Redis from 'ioredis';
import pg from 'pg';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

dotenv.config();

const { Pool } = pg;

// Configuration
const config = {
  db: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'drive_user',
    password: process.env.DB_PASSWORD || 'drive_secret_password',
    database: process.env.DB_NAME || 'drive_db',
  },
  minio: {
    endpoint: `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'minio'}:${process.env.MINIO_PORT || '9000'}`,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    filesBucket: process.env.MINIO_FILES_BUCKET || 'drive-files',
    thumbnailsBucket: process.env.MINIO_THUMBNAILS_BUCKET || 'drive-thumbnails',
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    queueName: process.env.REDIS_QUEUE_NAME || 'thumbnail_jobs',
  },
  thumbnail: {
    width: parseInt(process.env.THUMBNAIL_WIDTH || '256', 10),
    height: parseInt(process.env.THUMBNAIL_HEIGHT || '256', 10),
    maxRetries: 3,
  },
};

// Database Pool
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 5,
});

// S3 Client (Internal MinIO network)
const s3 = new S3Client({
  endpoint: config.minio.endpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: true,
});

// Redis Client
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy(times) {
    return Math.min(times * 1000, 5000);
  },
});

let isRunning = true;

/**
 * Stream to Buffer helper
 */
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (chunk) => chunks.push(chunk));
    readableStream.on('error', reject);
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Process a single thumbnail job
 */
async function processJob(jobData) {
  const { fileId, objectKey, mimeType, name, retryCount = 0 } = jobData;
  console.log(`[Worker] Processing thumbnail for fileId=${fileId} ("${name}"), attempt=${retryCount + 1}`);

  try {
    // 1. Update status to 'processing'
    await pool.query("UPDATE files SET thumb_status = 'processing' WHERE id = $1", [fileId]);

    // 2. Fetch original image from MinIO
    const getRes = await s3.send(
      new GetObjectCommand({
        Bucket: config.minio.filesBucket,
        Key: objectKey,
      })
    );

    const originalBuffer = await streamToBuffer(getRes.Body);

    // 3. Resize with Sharp
    const thumbnailBuffer = await sharp(originalBuffer)
      .resize(config.thumbnail.width, config.thumbnail.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 4. Save to MinIO thumbnails bucket
    const thumbnailKey = `thumbnails/${fileId}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: config.minio.thumbnailsBucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/webp',
      })
    );

    // 5. Update DB record to 'ready'
    await pool.query(
      "UPDATE files SET thumbnail_key = $1, thumb_status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [thumbnailKey, fileId]
    );

    console.log(`[Worker] ✅ Successfully generated thumbnail for fileId=${fileId} (${thumbnailKey})`);
  } catch (err) {
    console.error(`[Worker] ❌ Failed to generate thumbnail for fileId=${fileId}:`, err.message);

    if (retryCount + 1 < config.thumbnail.maxRetries) {
      console.log(`[Worker] 🔄 Re-enqueuing job for retry ${retryCount + 1}/${config.thumbnail.maxRetries}...`);
      await new Promise((r) => setTimeout(r, 2000 * (retryCount + 1))); // Backoff
      await redis.rpush(
        config.redis.queueName,
        JSON.stringify({ ...jobData, retryCount: retryCount + 1 })
      );
    } else {
      console.error(`[Worker] Max retries reached for fileId=${fileId}. Marking as 'failed'.`);
      await pool.query("UPDATE files SET thumb_status = 'failed' WHERE id = $1", [fileId]);
    }
  }
}

/**
 * Main worker loop
 */
async function startWorker() {
  console.log('🚀 Drive Mini Thumbnail Worker started.');
  console.log(`   - Queue: ${config.redis.queueName}`);
  console.log(`   - Thumbnail Dimensions: ${config.thumbnail.width}x${config.thumbnail.height}`);

  while (isRunning) {
    try {
      // BLPOP with 2-second timeout
      const result = await redis.blpop(config.redis.queueName, 2);
      if (result) {
        const [, jobJson] = result;
        try {
          const jobData = JSON.parse(jobJson);
          await processJob(jobData);
        } catch (parseErr) {
          console.error('[Worker] Error parsing job payload:', parseErr.message);
        }
      }
    } catch (loopErr) {
      if (isRunning) {
        console.error('[Worker] Queue pop error:', loopErr.message);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  console.log('[Worker] Graceful shutdown complete.');
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n[Worker] Caught SIGINT, stopping...');
  isRunning = false;
  await redis.quit();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Worker] Caught SIGTERM, stopping...');
  isRunning = false;
  await redis.quit();
  await pool.end();
  process.exit(0);
});

startWorker();

