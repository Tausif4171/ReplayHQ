/**
 * Zoom Import Worker
 *
 * Standalone BullMQ worker that downloads Zoom cloud recordings and uploads
 * them to MinIO. Run this as a separate process:
 *
 *   npx tsx src/workers/zoom-import.ts
 *
 * Requires the same environment variables as the Next.js app.
 */

import "dotenv/config";
import { Worker, Job, Queue } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import * as Minio from "minio";
import { Readable } from "stream";

// ---------------------------------------------------------------------------
// Clients (standalone — not shared with the Next.js app process)
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null }
);

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "replayhq-recordings";

// Producer-side handle for chaining: Zoom import → transcribe.
const transcribeQueue = new Queue("transcribe", { connection });

// ---------------------------------------------------------------------------
// Zoom token helpers (duplicated from src/lib/zoom.ts for standalone use)
// ---------------------------------------------------------------------------

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

async function getValidZoomToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "zoom" },
  });

  if (!account || !account.access_token) {
    throw new Error("No Zoom account connected");
  }

  const now = Math.floor(Date.now() / 1000);
  if (account.expires_at && account.expires_at < now + 300) {
    return refreshZoomToken(account);
  }

  return account.access_token;
}

async function refreshZoomToken(account: {
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
}): Promise<string> {
  if (!account.refresh_token) {
    throw new Error("No refresh token available");
  }

  const basicAuth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(ZOOM_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token refresh failed: ${res.status} ${err}`);
  }

  const tokens = await res.json();

  await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    data: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    },
  });

  return tokens.access_token;
}

async function refetchDownloadUrl(
  userId: string,
  meetingUuid: string,
  fileId: string
): Promise<string | null> {
  const token = await getValidZoomToken(userId);

  const encodedUuid =
    meetingUuid.startsWith("/") || meetingUuid.includes("//")
      ? encodeURIComponent(encodeURIComponent(meetingUuid))
      : encodeURIComponent(meetingUuid);

  const res = await fetch(
    `${ZOOM_API_BASE}/meetings/${encodedUuid}/recordings`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const file = data.recording_files?.find(
    (f: { id: string }) => f.id === fileId
  );
  return file?.download_url || null;
}

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

interface ZoomImportJobData {
  recordingId: string;
  userId: string;
  downloadUrl: string;
  objectKey: string;
  fileSize: number;
  meetingUuid: string;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker<ZoomImportJobData>(
  "zoom-import",
  async (job: Job<ZoomImportJobData>) => {
    const { recordingId, userId, downloadUrl, objectKey, fileSize, meetingUuid } =
      job.data;

    console.log(
      `[zoom-import] Starting job ${job.id} for recording ${recordingId}`
    );

    try {
      // 1. Get a valid Zoom access token
      const token = await getValidZoomToken(userId);

      // 2. Download from Zoom
      let downloadUrlWithToken = `${downloadUrl}?access_token=${token}`;
      let response = await fetch(downloadUrlWithToken, { redirect: "follow" });

      // If 403/401, the download URL may have expired — re-fetch from Zoom API
      if (response.status === 403 || response.status === 401) {
        console.log(
          `[zoom-import] Download URL expired, re-fetching for job ${job.id}`
        );
        const freshUrl = await refetchDownloadUrl(
          userId,
          meetingUuid,
          job.data.downloadUrl.split("/").pop()?.split("?")[0] || ""
        );
        if (!freshUrl) {
          throw new Error("Failed to re-fetch download URL from Zoom");
        }
        const freshToken = await getValidZoomToken(userId);
        downloadUrlWithToken = `${freshUrl}?access_token=${freshToken}`;
        response = await fetch(downloadUrlWithToken, { redirect: "follow" });
      }

      if (!response.ok) {
        throw new Error(
          `Zoom download failed: ${response.status} ${response.statusText}`
        );
      }

      // 3. Ensure MinIO bucket exists
      const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
      if (!bucketExists) {
        await minioClient.makeBucket(BUCKET_NAME);
      }

      // 4. Stream directly to MinIO (no memory buffering)
      const contentLength = parseInt(
        response.headers.get("content-length") || String(fileSize)
      );

      // Convert Web ReadableStream to Node Readable
      const reader = response.body!.getReader();
      const nodeStream = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        },
      });

      await minioClient.putObject(BUCKET_NAME, objectKey, nodeStream, contentLength, {
        "Content-Type": "video/mp4",
      });

      console.log(
        `[zoom-import] Uploaded ${objectKey} (${contentLength} bytes) to MinIO`
      );

      // 5. Update recording status to READY
      await prisma.recording.update({
        where: { id: recordingId },
        data: { status: "READY" },
      });

      // 6. Hand off to the transcription pipeline.
      await transcribeQueue.add(
        "transcribe",
        { recordingId },
        { jobId: `transcribe:${recordingId}` }
      );

      await job.updateProgress(100);
      console.log(
        `[zoom-import] Job ${job.id} completed for recording ${recordingId}`
      );

      return { success: true, objectKey };
    } catch (error) {
      console.error(`[zoom-import] Job ${job.id} error:`, error);

      // Update recording status to FAILED
      await prisma.recording.update({
        where: { id: recordingId },
        data: { status: "FAILED" },
      });

      throw error; // BullMQ will retry based on job options
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(
    `[zoom-import] Job ${job.id} completed successfully`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[zoom-import] Job ${job?.id} failed: ${err.message}`
  );
});

console.log("[zoom-import] Worker started, waiting for jobs...");
