import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { transcribeQueue } from "@/lib/queue";

/**
 * Admin re-transcribe endpoint. Forces a new transcription job for an existing
 * recording (e.g., after improving the model, fixing a bad source file, or
 * recovering from a FAILED status). Idempotency is enforced inside the worker.
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
    select: { id: true, uploadedById: true, videoUrl: true },
  });

  if (!recording) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  if (!recording.videoUrl) {
    return NextResponse.json(
      { error: "Recording has no video to transcribe" },
      { status: 400 }
    );
  }

  // Reset transcribedAt so the worker's idempotency check forces a re-run.
  await prisma.recording.update({
    where: { id },
    data: { transcribedAt: null, transcriptError: null },
  });

  const job = await transcribeQueue.add(
    "transcribe",
    { recordingId: id },
    { jobId: `transcribe:${id}:${Date.now()}` }
  );

  return NextResponse.json({ enqueued: true, jobId: job.id });
}
