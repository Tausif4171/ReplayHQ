import { NextRequest, NextResponse } from "next/server";
import { requireUploaderUser } from "@/lib/access";
import { apiErrorResponse } from "@/lib/api-errors";
import { getZoomAccount, listZoomRecordings } from "@/lib/zoom";
import type { ZoomMeetingSummary, ZoomFileSummary } from "@/lib/zoom";

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUploaderUser();

    const account = await getZoomAccount(user.id);
    if (!account) {
      return NextResponse.json(
        { error: "Zoom not connected" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || defaultFromDate();
    const to = searchParams.get("to") || todayISO();
    const pageToken = searchParams.get("page_token") || undefined;

    const recordings = await listZoomRecordings(
      user.id,
      from,
      to,
      30,
      pageToken
    );

    // Filter to MP4 files only, strip download URLs (security)
    const meetings: ZoomMeetingSummary[] = (recordings.meetings || []).map(
      (meeting) => ({
        id: meeting.uuid,
        meetingId: meeting.id,
        topic: meeting.topic,
        startTime: meeting.start_time,
        duration: meeting.duration,
        totalSize: meeting.total_size,
        recordingFiles: (meeting.recording_files || [])
          .filter((f) => f.file_type === "MP4")
          .map(
            (f): ZoomFileSummary => ({
              id: f.id,
              fileType: f.file_type,
              fileSize: f.file_size,
              recordingType: f.recording_type,
              recordingStart: f.recording_start,
              recordingEnd: f.recording_end,
            })
          ),
      })
    );

    return NextResponse.json({
      meetings: meetings.filter((m) => m.recordingFiles.length > 0),
      nextPageToken: recordings.next_page_token || null,
      totalRecords: recordings.total_records,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
