import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  db: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'drive_user',
    password: process.env.DB_PASSWORD || 'drive_secret_password',
    database: process.env.DB_NAME || 'drive_db',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_drive_mini_devops_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // MinIO / S3 Configuration
  minio: {
    // Internal endpoint used by API inside container/network
    endpoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    filesBucket: process.env.MINIO_FILES_BUCKET || 'drive-files',
    thumbnailsBucket: process.env.MINIO_THUMBNAILS_BUCKET || 'drive-thumbnails',
    // Public endpoint for browser/client presigned URLs (e.g. http://localhost:9000)
    publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    queueName: process.env.REDIS_QUEUE_NAME || 'thumbnail_jobs',
  },

  // Storage Quota Defaults (1 GB default per user)
  defaultQuotaBytes: parseInt(process.env.DEFAULT_QUOTA_BYTES || '1073741824', 10),
};

