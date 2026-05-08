import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
      _count: { select: { watchHistory: true, bookmarks: true } },
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(recording);
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

  const recording = await prisma.recording.findUnique({
    where: { id },
    select: { uploadedById: true },
  });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (recording.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.recording.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
