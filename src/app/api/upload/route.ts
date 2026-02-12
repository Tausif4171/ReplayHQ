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

  await ensureBucket();
  const presignedUrl = await getPresignedUploadUrl(objectKey);

  return NextResponse.json({
    presignedUrl,
    objectKey,
  });
}
