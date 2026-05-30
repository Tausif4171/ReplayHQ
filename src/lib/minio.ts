import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const isLocal = process.env.MINIO_USE_SSL !== "true";

export const s3Client = new S3Client({
  region: process.env.MINIO_REGION || "us-east-1",
  endpoint: isLocal
    ? `http://${process.env.MINIO_ENDPOINT || "localhost"}:${process.env.MINIO_PORT || 9000}`
    : `https://${process.env.MINIO_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true,
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || "replayhq-recordings";

export async function ensureBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
  }
}

export async function getPresignedUploadUrl(objectName: string, expiry = 3600): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: objectName });
  return getSignedUrl(s3Client, command, { expiresIn: expiry });
}

export async function getPresignedDownloadUrl(objectName: string, expiry = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: objectName });
  return getSignedUrl(s3Client, command, { expiresIn: expiry });
}