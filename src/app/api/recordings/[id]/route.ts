import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { BUCKET_NAME, s3Client } from "@/lib/minio";

function isStorageObjectKey(value: string | null | undefined) {
  return Boolean(
    value && value !== "pending-upload" && !value.startsWith("http")
  );
}

async function deleteStorageObject(key: string) {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  const currentUserId = session?.user?.id ?? "";
  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { role: true },
      })
    : null;

  const recording = await prisma.recording.findUnique({
    where: { id },
    include: {
      presenter: { select: { id: true, name: true, image: true, role: true } },
      series: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true } },
      comments: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      segments: {
        orderBy: { index: "asc" },
        select: { startTime: true, text: true },
      },
      watchHistory: {
        where: { userId: currentUserId },
        select: { progress: true, completed: true, lastWatchedAt: true },
        take: 1,
      },
      bookmarks: {
        where: { userId: currentUserId, timestamp: null },
        select: { id: true, timestamp: true, createdAt: true },
        take: 1,
      },
      _count: { select: { watchHistory: true, bookmarks: true } },
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { watchHistory, bookmarks, ...recordingData } = recording;

  return NextResponse.json({
    ...recordingData,
    viewerWatchHistory: watchHistory[0] ?? null,
    viewerBookmark: bookmarks[0] ?? null,
    permissions: {
      canDelete: currentUser?.role === "ADMIN",
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const recording = await prisma.recording.update({
    where: { id },
    data: body,
    include: {
      presenter: { select: { id: true, name: true, image: true, role: true } },
      series: { select: { id: true, name: true } },
      tags: true,
    },
  });

  return NextResponse.json(recording);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recording = await prisma.recording.findUnique({
    where: { id },
    select: { videoUrl: true, thumbnailUrl: true },
  });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.recording.delete({ where: { id } });

  const objectKeys = [recording.videoUrl, recording.thumbnailUrl].filter(
    isStorageObjectKey
  ) as string[];

  const cleanupResults = await Promise.allSettled(
    objectKeys.map((key) => deleteStorageObject(key))
  );

  cleanupResults.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Failed to delete recording object:", {
        key: objectKeys[index],
        error:
          result.reason instanceof Error ? result.reason.message : result.reason,
      });
    }
  });

  return NextResponse.json({ success: true });
}
