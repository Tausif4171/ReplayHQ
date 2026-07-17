import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request";

const WatchHistorySchema = z.object({
  recordingId: z.string().min(1),
  progress: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.watchHistory.findMany({
    where: {
      userId: session.user.id,
      completed: false,
      progress: { gt: 0 },
    },
    include: {
      recording: {
        include: {
          presenter: { select: { id: true, name: true, image: true, role: true } },
          series: { select: { id: true, name: true } },
          tags: { select: { name: true } },
          _count: { select: { watchHistory: true, comments: true } },
        },
      },
    },
    orderBy: { lastWatchedAt: "desc" },
    take: 10,
  });

  return NextResponse.json(history);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = WatchHistorySchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid watch history payload." },
      { status: 400 }
    );
  }

  const { recordingId, completed } = parsed.data;
  const progress = parsed.data.progress ?? 0;

  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    select: { id: true },
  });

  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  const uniqueWhere = {
    userId_recordingId: {
      userId: session.user.id,
      recordingId,
    },
  };

  const existing = await prisma.watchHistory.findUnique({
    where: uniqueWhere,
    select: { id: true, progress: true, completed: true },
  });

  const nextProgress =
    existing && progress === 0 && existing.progress > 0
      ? existing.progress
      : progress;
  const nextCompleted = completed ?? false;

  const [entry, totalViews] = await prisma.$transaction([
    prisma.watchHistory.upsert({
      where: uniqueWhere,
      update: {
        progress: nextProgress,
        completed: nextCompleted,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        recordingId,
        progress: nextProgress,
        completed: nextCompleted,
      },
    }),
    prisma.watchHistory.count({ where: { recordingId } }),
  ]);

  return NextResponse.json({
    entry,
    created: !existing,
    totalViews,
  });
}
