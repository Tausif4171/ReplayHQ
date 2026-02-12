import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.watchHistory.findMany({
    where: {
      userId: session.user.id,
      completed: false,
    },
    include: {
      recording: {
        include: {
          presenter: { select: { id: true, name: true, image: true, role: true } },
          series: { select: { id: true, name: true } },
          tags: { select: { name: true } },
        },
      },
    },
    orderBy: { lastWatchedAt: "desc" },
    take: 10,
  });

  return NextResponse.json(history);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordingId, progress, completed } = await request.json();

  if (!recordingId) {
    return NextResponse.json(
      { error: "recordingId is required" },
      { status: 400 }
    );
  }

  const entry = await prisma.watchHistory.upsert({
    where: {
      userId_recordingId: {
        userId: session.user.id,
        recordingId,
      },
    },
    update: {
      progress: progress ?? 0,
      completed: completed ?? false,
      lastWatchedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      recordingId,
      progress: progress ?? 0,
      completed: completed ?? false,
    },
  });

  return NextResponse.json(entry);
}
