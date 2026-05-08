/**
 * Summarization Worker
 *
 * Standalone BullMQ worker that takes a recording's transcript and produces
 * a summary, TL;DR, key takeaways, and AI-suggested tags via a local Ollama
 * instance running qwen2.5 (or any model exposed at OLLAMA_BASE_URL).
 *
 *   npm run worker:summarize
 *
 * Pipeline: transcribe → summarize → (Phase 3: embed). Job payload is just
 * { recordingId }; the worker reads everything else fresh from Postgres.
 */

import "dotenv/config";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, type Prisma } from "@prisma/client";
import pino from "pino";
import { OllamaSummarizer, type Summarizer } from "../lib/summarizer";
import { SUMMARIZE_PROMPT_VERSION } from "../lib/prompts/summarize-v1";
import type { SummarizeJobData } from "../lib/queue";

const log = pino({
  name: "summarize-worker",
  level: process.env.LOG_LEVEL || "info",
});

const prisma = new PrismaClient();

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null }
);

const summarizer: Summarizer = new OllamaSummarizer();

const worker = new Worker<SummarizeJobData>(
  "summarize",
  async (job: Job<SummarizeJobData>) => {
    const { recordingId } = job.data;
    const jobLog = log.child({ jobId: job.id, recordingId });

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        presenter: { select: { name: true } },
      },
    });

    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    if (!recording.transcript) {
      throw new Error(
        `Recording ${recordingId} has no transcript yet. Was the transcribe worker run first?`
      );
    }

    // Idempotency: skip if we already summarized at the current prompt version.
    // Bumping SUMMARIZE_PROMPT_VERSION (or the admin endpoint nulling
    // summarizedAt) is how we force re-runs.
    if (
      recording.summarizedAt &&
      recording.summaryPromptVersion === SUMMARIZE_PROMPT_VERSION
    ) {
      jobLog.info(
        { promptVersion: SUMMARIZE_PROMPT_VERSION },
        "already summarized at current prompt version, skipping"
      );
      return { skipped: true };
    }

    // Pre-fetch existing tags so the LLM prefers our canon over inventing new
    // synonyms (e.g. "k8s" vs "kubernetes").
    const existingTags = await prisma.tag.findMany({ select: { name: true } });

    try {
      jobLog.info(
        {
          step: "summarize",
          transcriptChars: recording.transcript.length,
          existingTagsCount: existingTags.length,
        },
        "calling summarizer"
      );

      const result = await summarizer.summarize({
        transcript: recording.transcript,
        recordingTitle: recording.title,
        presenterName: recording.presenter?.name ?? null,
        existingTags: existingTags.map((t) => t.name),
      });

      jobLog.info(
        {
          step: "summarize",
          modelId: result.modelId,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          durationMs: result.durationMs,
          tagCount: result.suggestedTags.length,
          takeawaysCount: result.keyTakeaways.length,
        },
        "summarized"
      );

      // Resolve tags: upsert each suggested tag and connect it. We replace the
      // recording's tag set entirely with the AI-generated one for v1; manual
      // tag preservation can come later via a separate `manualTags` field.
      const tagOps = result.suggestedTags.map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      );

      await prisma.$transaction([
        ...tagOps,
        prisma.recording.update({
          where: { id: recordingId },
          data: {
            summary: result.summary,
            tldr: result.tldr,
            keyTakeaways: result.keyTakeaways as Prisma.InputJsonValue,
            summarizedAt: new Date(),
            summarizationError: null,
            summaryModel: result.modelId,
            summaryPromptVersion: result.promptVersion,
            tags: {
              set: result.suggestedTags.map((name) => ({ name })),
            },
          },
        }),
      ]);

      jobLog.info(
        { step: "persist", tags: result.suggestedTags.length },
        "saved"
      );

      await job.updateProgress(100);
      return {
        success: true,
        modelId: result.modelId,
        tags: result.suggestedTags.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      jobLog.error({ err: message }, "summarization failed");
      await prisma.recording.update({
        where: { id: recordingId },
        data: { summarizationError: message.slice(0, 2000) },
      });
      throw err;
    }
  },
  {
    connection,
    concurrency: 1, // Ollama serializes inference; queueing locally just stacks
                    // requests anyway — keep it explicit.
  }
);

worker.on("completed", (job) => {
  log.info({ jobId: job.id }, "job completed");
});

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err: err.message }, "job failed");
});

log.info(
  { promptVersion: SUMMARIZE_PROMPT_VERSION },
  "summarize worker started"
);
