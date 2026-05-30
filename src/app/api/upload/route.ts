import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, ensureBucket } from "@/lib/minio";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await request.json();

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  const ext = filename.split(".").pop() || "mp4";
  const objectKey = `recordings/${session.user.id}/${crypto.randomUUID()}.${ext}`;

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
}
