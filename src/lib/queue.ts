import { Queue } from "bullmq";
import IORedis from "ioredis";

const QUEUE_ADD_TIMEOUT_MS = Number(process.env.QUEUE_ADD_TIMEOUT_MS || 2500);

// Singleton Redis connection for queues
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true, // Don't connect until needed
});

export const zoomImportQueue = new Queue("zoom-import", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s → 10s → 20s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/**
 * Transcription queue. Producers (zoom-import worker, /api/upload, admin
 * re-transcribe endpoint) all publish here with `{ recordingId }`. The worker
 * fetches the recording fresh from the DB — never trusts payload data beyond
 * the ID. This decouples upstream changes from worker logic.
 */
export interface TranscribeJobData {
  recordingId: string;
}

export const transcribeQueue = new Queue<TranscribeJobData>("transcribe", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30_000, // 30s → 2m → 8m. Transcription is minutes-long; aggressive
      // retry just stacks load — we'd rather wait.
    },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 }, // keep failures a week for debugging
  },
});

/**
 * Summarization queue. Chained automatically by the transcribe worker on
 * success, and exposed via the admin re-summarize endpoint. Same payload
 * pattern as transcribe: only the recordingId travels over the wire — the
 * worker reads everything else fresh from the DB.
 */
export interface SummarizeJobData {
  recordingId: string;
}

export const summarizeQueue = new Queue<SummarizeJobData>("summarize", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10_000, // 10s → 40s → 160s. LLM calls finish in seconds, so we
      // can retry sooner than transcription.
    },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export interface EnqueueResult {
  enqueued: boolean;
  jobId?: string;
  reason?: string;
}

async function enqueueWithTimeout(
  addJob: Promise<{ id?: string }>,
  timeoutMs = QUEUE_ADD_TIMEOUT_MS
): Promise<EnqueueResult> {
  try {
    let timedOut = false;
    const safeAddJob = addJob.catch((error) => {
      if (timedOut) return null;
      throw error;
    });

    const job = await Promise.race([
      safeAddJob,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, timeoutMs)
      ),
    ]);

    if (!job) {
      return { enqueued: false, reason: "queue_enqueue_timeout" };
    }

    return { enqueued: true, jobId: job.id };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "queue_enqueue_failed";
    return { enqueued: false, reason };
  }
}

export function enqueueTranscription(
  recordingId: string,
  jobId?: string,
  timeoutMs?: number
) {
  return enqueueWithTimeout(
    transcribeQueue.add(
      "transcribe",
      { recordingId },
      { jobId: jobId || `transcribe-${recordingId}` }
    ),
    timeoutMs
  );
}
