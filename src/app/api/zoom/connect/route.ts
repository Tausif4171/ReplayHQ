import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { requireUploaderUser } from "@/lib/access";
import { getZoomAuthorizationUrl, generateSignedState } from "@/lib/zoom";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUploaderUser();
    const state = generateSignedState(user.id);
    const authUrl = getZoomAuthorizationUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.redirect(
      new URL("/settings?zoom=error&reason=upload_access_required", request.url)
    );
  }
}
