import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

// Internal client for server-side S3 calls (API -> MinIO inside container network)
const internalEndpoint = `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endpoint}:${config.minio.port}`;

export const s3Internal = new S3Client({
  endpoint: internalEndpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: true,
});

// Client used for generating presigned URLs accessible from user browser
export const s3Public = new S3Client({
  endpoint: config.minio.publicUrl,
  region: 'us-east-1',
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: true,
});

/**
 * Ensure required buckets exist on MinIO startup
 */
export async function ensureBuckets() {
  const buckets = [config.minio.filesBucket, config.minio.thumbnailsBucket];
  for (const bucket of buckets) {
    try {
      await s3Internal.send(new HeadBucketCommand({ Bucket: bucket }));
      console.log(`[MinIO] Bucket "${bucket}" is ready.`);
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        console.log(`[MinIO] Bucket "${bucket}" does not exist. Creating...`);
        try {
          await s3Internal.send(new CreateBucketCommand({ Bucket: bucket }));
          console.log(`[MinIO] Bucket "${bucket}" created successfully.`);
        } catch (createErr) {
          console.warn(`[MinIO] Failed to create bucket "${bucket}":`, createErr.message);
        }
      } else {
        console.warn(`[MinIO] Could not head bucket "${bucket}":`, err.message);
      }
    }
  }
}

/**
 * Generate a Presigned URL for direct client upload (PUT)
 * @param {string} objectKey 
 * @param {string} contentType 
 * @param {number} expiresInSeconds 
 */
export async function generateUploadUrl(objectKey, contentType = 'application/octet-stream', expiresInSeconds = 900) {
  const command = new PutObjectCommand({
    Bucket: config.minio.filesBucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Public, command, { expiresIn: expiresInSeconds });
  return uploadUrl;
}

/**
 * Generate a Presigned URL for downloading/viewing a file (GET)
 * @param {string} bucket 
 * @param {string} objectKey 
 * @param {string} downloadFilename 
 * @param {number} expiresInSeconds 
 */
export async function generateDownloadUrl(
  bucket,
  objectKey,
  downloadFilename = null,
  expiresInSeconds = 3600
) {
  const params = {
    Bucket: bucket || config.minio.filesBucket,
    Key: objectKey,
  };

  if (downloadFilename) {
    const encoded = encodeURIComponent(downloadFilename);
    params.ResponseContentDisposition = `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
  } else {
    params.ResponseContentDisposition = 'inline';
  }

  const command = new GetObjectCommand(params);
  const downloadUrl = await getSignedUrl(s3Public, command, { expiresIn: expiresInSeconds });
  return downloadUrl;
}

/**
 * Check if object exists and get metadata (size, mime)
 * @param {string} bucket 
 * @param {string} objectKey 
 */
export async function getObjectMetadata(bucket, objectKey) {
  const command = new HeadObjectCommand({
    Bucket: bucket || config.minio.filesBucket,
    Key: objectKey,
  });
  return await s3Internal.send(command);
}

/**
 * Delete object from MinIO
 * @param {string} bucket 
 * @param {string} objectKey 
 */
export async function deleteObject(bucket, objectKey) {
  const command = new DeleteObjectCommand({
    Bucket: bucket || config.minio.filesBucket,
    Key: objectKey,
  });
  return await s3Internal.send(command);
}

