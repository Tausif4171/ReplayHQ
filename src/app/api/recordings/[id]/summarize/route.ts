import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { summarizeQueue } from "@/lib/queue";

/**
 * Admin re-summarize endpoint. Forces a new summarization job for an existing
 * recording (e.g. after editing the prompt, swapping the LLM, or recovering
 * from a failure). Idempotency lives in the worker — we just clear the
 * stamps that gate it.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const recording = await prisma.recording.findUnique({
    where: { id },
    select: { id: true, transcript: true },
  });

  if (!recording) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  if (!recording.transcript) {
    return NextResponse.json(
      { error: "Recording has no transcript yet — run transcription first" },
      { status: 400 }
    );
  }

  await prisma.recording.update({
    where: { id },
    data: { summarizedAt: null, summarizationError: null },
  });

  const job = await summarizeQueue.add(
    "summarize",
    { recordingId: id },
    { jobId: `summarize-${id}-${Date.now()}` }
  );

  return NextResponse.json({ enqueued: true, jobId: job.id });
}
