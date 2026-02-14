import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getZoomAccount, fetchMeetingRecordings } from "@/lib/zoom";
import { ensureBucket } from "@/lib/minio";
import { zoomImportQueue } from "@/lib/queue";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { meetingUuid, recordingFileId, title, description, seriesId, tags } =
    body;

  if (!meetingUuid || !recordingFileId || !title) {
    return NextResponse.json(
      { error: "meetingUuid, recordingFileId, and title are required" },
      { status: 400 }
    );
  }

  // Verify Zoom is connected
  const account = await getZoomAccount(session.user.id);
  if (!account) {
    return NextResponse.json(
      { error: "Zoom not connected" },
      { status: 400 }
    );
  }

  try {
    // Fetch meeting recording details to get download URL (server-side only)
    const meetingData = await fetchMeetingRecordings(
      session.user.id,
      meetingUuid
    );

    const targetFile = meetingData.recording_files?.find(
      (f) => f.id === recordingFileId
    );

    if (!targetFile) {
      return NextResponse.json(
        { error: "Recording file not found" },
        { status: 404 }
      );
    }

    // Generate MinIO object key
    const objectKey = `recordings/${session.user.id}/${crypto.randomUUID()}.mp4`;
    await ensureBucket();

    // Create recording with PROCESSING status
    const recording = await prisma.recording.create({
      data: {
        title,
        description: description || undefined,
        videoUrl: objectKey,
        status: "PROCESSING",
        duration: meetingData.duration ? meetingData.duration * 60 : undefined,
        uploadedById: session.user.id,
        presenterId: session.user.id,
        seriesId: seriesId || undefined,
        recordedAt: meetingData.start_time
          ? new Date(meetingData.start_time)
          : undefined,
        tags: tags?.length
          ? {
              connectOrCreate: tags.map((tag: string) => ({
                where: { name: tag },
                create: { name: tag },
              })),
            }
          : undefined,
      },
    });

    // Enqueue background download job
    await zoomImportQueue.add("zoom-import", {
      recordingId: recording.id,
      userId: session.user.id,
      downloadUrl: targetFile.download_url,
      objectKey,
      fileSize: targetFile.file_size,
      meetingUuid,
    });

    return NextResponse.json(
      {
        id: recording.id,
        status: "PROCESSING",
        message: "Import started. The recording will be available shortly.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Zoom import failed:", error);
    return NextResponse.json(
      { error: "Failed to start Zoom import" },
      { status: 500 }
    );
  }
}
