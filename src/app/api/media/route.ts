import { NextRequest, NextResponse } from "next/server";
import { getPresignedDownloadUrl } from "@/lib/minio";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    const url = await getPresignedDownloadUrl(key, 3600);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
