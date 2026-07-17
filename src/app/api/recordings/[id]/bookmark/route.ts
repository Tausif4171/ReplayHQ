import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request";

async function getRecording(id: string) {
  return prisma.recording.findUnique({
    where: { id },
    select: { id: true },
  });
}

async function getBookmarkState(userId: string, recordingId: string) {
  const [bookmark, totalBookmarks] = await Promise.all([
    prisma.bookmark.findFirst({
      where: {
        userId,
        recordingId,
        timestamp: null,
      },
      select: {
        id: true,
        timestamp: true,
        createdAt: true,
      },
    }),
    prisma.bookmark.count({ where: { recordingId } }),
  ]);

  return {
    bookmarked: Boolean(bookmark),
    bookmark,
    totalBookmarks,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recording = await getRecording(id);
  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  const existing = await prisma.bookmark.findFirst({
    where: {
      userId: session.user.id,
      recordingId: id,
      timestamp: null,
    },
    select: {
      id: true,
      timestamp: true,
      createdAt: true,
    },
  });

  if (!existing) {
    await prisma.bookmark.create({
      data: {
        userId: session.user.id,
        recordingId: id,
        timestamp: null,
      },
    });
  }

  return NextResponse.json(await getBookmarkState(session.user.id, id));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recording = await getRecording(id);
  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  await prisma.bookmark.deleteMany({
    where: {
      userId: session.user.id,
      recordingId: id,
      timestamp: null,
    },
  });

  return NextResponse.json(await getBookmarkState(session.user.id, id));
}
