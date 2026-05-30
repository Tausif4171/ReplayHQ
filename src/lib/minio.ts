import * as Minio from "minio";

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  pathStyle: true,
  // region: process.env.MINIO_REGION || "us-east-1",
  region: "ap-south-1", // ← hardcoded, not from env
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || "replayhq-recordings";

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME);
  }
}

export async function getPresignedUploadUrl(
  objectName: string,
  expiry = 3600
): Promise<string> {
  return minioClient.presignedPutObject(BUCKET_NAME, objectName, expiry);
}

export async function getPresignedDownloadUrl(
  objectName: string,
  expiry = 3600
): Promise<string> {
  return minioClient.presignedGetObject(BUCKET_NAME, objectName, expiry);
}
