import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { requireUploaderUser } from "@/lib/access";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";
import { getZoomAccount, fetchMeetingRecordings } from "@/lib/zoom";
import { ensureBucket } from "@/lib/minio";
import { zoomImportQueue } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const user = await requireUploaderUser();
    const body = await request.json();
    const { meetingUuid, recordingFileId, title, description, seriesId, tags } =
      body;

    if (!meetingUuid || !recordingFileId || !title) {
      throw new ApiError(
        400,
        "meetingUuid, recordingFileId, and title are required"
      );
    }

    // Verify Zoom is connected
    const account = await getZoomAccount(user.id);
    if (!account) {
      throw new ApiError(400, "Zoom not connected");
    }

    // Fetch meeting recording details to get download URL (server-side only)
    const meetingData = await fetchMeetingRecordings(
      user.id,
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
    const objectKey = `recordings/${user.id}/${crypto.randomUUID()}.mp4`;
    await ensureBucket();

    // Create recording with PROCESSING status
    const recording = await prisma.recording.create({
      data: {
        title,
        description: description || undefined,
        videoUrl: objectKey,
        status: "PROCESSING",
        duration: meetingData.duration ? meetingData.duration * 60 : undefined,
        uploadedById: user.id,
        presenterId: user.id,
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
      userId: user.id,
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
    return apiErrorResponse(error);
  }
}
