/**
 * Transcription Worker
 *
 * Standalone BullMQ worker that pulls a recording's video from MinIO, extracts
 * audio with ffmpeg, transcribes it with whisper.cpp (local, GPU-accelerated
 * on Apple Silicon), and writes a full transcript + per-segment timestamps to
 * Postgres.
 *
 *   npm run worker:transcribe
 *
 * Pipeline: zoom-import / upload  →  transcribe  →  (next phases: summarize,
 * embed). The worker only trusts `recordingId` from the job payload — every
 * other field is read fresh from the DB so retries pick up the latest state.
 */

import "dotenv/config";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, RecordingStatus } from "@prisma/client";
import * as Minio from "minio";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pino from "pino";
import { extractAudio, probeDuration } from "../lib/ffmpeg";
import { WhisperCppTranscriber, type Transcriber } from "../lib/transcriber";
import type { TranscribeJobData } from "../lib/queue";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WHISPER_MODEL_PATH =
  process.env.WHISPER_MODEL_PATH ||
  path.join(process.env.HOME || "", "whisper-models/ggml-base.en.bin");

const BUCKET_NAME = process.env.MINIO_BUCKET || "replayhq-recordings";

// ---------------------------------------------------------------------------
// Clients (standalone — separate process from Next.js)
// ---------------------------------------------------------------------------

const log = pino({ name: "transcribe-worker", level: process.env.LOG_LEVEL || "info" });

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

const transcriber: Transcriber = new WhisperCppTranscriber(WHISPER_MODEL_PATH);

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker<TranscribeJobData>(
  "transcribe",
  async (job: Job<TranscribeJobData>) => {
    const { recordingId } = job.data;
    const jobLog = log.child({ jobId: job.id, recordingId });

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    // Idempotency: skip if a transcript exists. To force a re-run (e.g. after
    // a model upgrade or a corrupt source), the admin re-transcribe endpoint
    // explicitly clears `transcribedAt` before enqueuing.
    //
    // We deliberately do NOT compare against `updatedAt` here: the worker's
    // own write to the Recording row bumps `updatedAt`, which would mask
    // every successful transcription as "stale" on retry.
    if (recording.transcribedAt) {
      jobLog.info("already transcribed, skipping");
      return { skipped: true };
    }

    if (!recording.videoUrl) {
      throw new Error(`Recording ${recordingId} has no videoUrl`);
    }

    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: RecordingStatus.TRANSCRIBING, transcriptError: null },
    });

    const tmpDir = await mkdtemp(path.join(tmpdir(), `transcribe-${recordingId}-`));
    const videoPath = path.join(tmpDir, "video");
    const audioPath = path.join(tmpDir, "audio.wav");

    try {
      // 1. Pull the video from MinIO to a temp file. We don't stream into
      //    ffmpeg's stdin because ffmpeg seeks the input for some codecs.
      jobLog.info({ step: "download" }, "downloading from MinIO");
      const stream = await minioClient.getObject(BUCKET_NAME, recording.videoUrl);
      const chunks: Buffer[] = [];
      for await (const c of stream) chunks.push(c as Buffer);
      await writeFile(videoPath, Buffer.concat(chunks));
      jobLog.info({ step: "download", bytes: Buffer.concat(chunks).length }, "downloaded");

      // 2. Extract mono 16 kHz WAV (whisper's native format).
      jobLog.info({ step: "extract_audio" }, "extracting audio");
      await extractAudio(videoPath, audioPath);
      const audioDurationSec = await probeDuration(audioPath);
      jobLog.info({ step: "extract_audio", durationSec: audioDurationSec }, "extracted");

      // 3. Transcribe with whisper.cpp.
      jobLog.info({ step: "whisper" }, "starting whisper.cpp");
      const result = await transcriber.transcribe(audioPath);
      jobLog.info(
        {
          step: "whisper",
          segments: result.segments.length,
          modelId: result.modelId,
          transcribeMs: result.durationMs,
          realtimeRatio: audioDurationSec
            ? (audioDurationSec / (result.durationMs / 1000)).toFixed(1) + "x"
            : null,
        },
        "transcribed"
      );

      // 4. Persist atomically: replace any prior segments, write transcript,
      //    flip status back to READY, stamp transcribedAt.
      await prisma.$transaction([
        prisma.transcriptSegment.deleteMany({ where: { recordingId } }),
        prisma.transcriptSegment.createMany({
          data: result.segments.map((s, i) => ({
            recordingId,
            index: i,
            startTime: s.startTime,
            endTime: s.endTime,
            text: s.text,
          })),
        }),
        prisma.recording.update({
          where: { id: recordingId },
          data: {
            transcript: result.fullText,
            transcribedAt: new Date(),
            transcriptError: null,
            status: RecordingStatus.READY,
          },
        }),
      ]);
      jobLog.info({ step: "persist", segments: result.segments.length }, "saved");

      await job.updateProgress(100);
      return {
        success: true,
        segments: result.segments.length,
        modelId: result.modelId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      jobLog.error({ err: message }, "transcription failed");
      await prisma.recording.update({
        where: { id: recordingId },
        data: {
          status: RecordingStatus.FAILED,
          transcriptError: message.slice(0, 2000),
        },
      });
      throw err; // BullMQ will retry per the queue's policy
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  },
  {
    connection,
    concurrency: 1, // whisper.cpp pegs the GPU; one job at a time on a laptop
  }
);

worker.on("completed", (job) => {
  log.info({ jobId: job.id }, "job completed");
});

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err: err.message }, "job failed");
});

log.info({ model: WHISPER_MODEL_PATH }, "transcribe worker started");
