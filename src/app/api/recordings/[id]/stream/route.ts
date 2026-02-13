import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/minio";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const recording = await prisma.recording.findUnique({
    where: { id },
    select: { videoUrl: true },
  });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!recording.videoUrl || recording.videoUrl === "pending-upload") {
    return NextResponse.json(
      { error: "Video not yet uploaded" },
      { status: 404 }
    );
  }

  try {
    const url = await getPresignedDownloadUrl(recording.videoUrl, 3600);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to generate stream URL:", error);
    return NextResponse.json(
      { error: "Failed to generate video URL" },
      { status: 500 }
    );
  }
}
