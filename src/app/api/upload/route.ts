import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, ensureBucket } from "@/lib/minio";
import { requireUploaderUser } from "@/lib/access";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const user = await requireUploaderUser();
    const { filename } = await request.json();

    if (!filename) {
      throw new ApiError(400, "Filename is required");
    }

    const ext = filename.split(".").pop() || "mp4";
    const objectKey = `recordings/${user.id}/${crypto.randomUUID()}.${ext}`;

    // Try to ensure bucket exists, but don't crash if it fails (e.g. Supabase)
    try {
      await ensureBucket();
    } catch {
      // Bucket likely already exists or operation not supported
    }

    const presignedUrl = await getPresignedUploadUrl(objectKey);

    return NextResponse.json({
      presignedUrl,
      objectKey,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
