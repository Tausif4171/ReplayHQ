import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getZoomAuthorizationUrl, generateSignedState } from "@/lib/zoom";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = generateSignedState(session.user.id);
  const authUrl = getZoomAuthorizationUrl(state);

  return NextResponse.redirect(authUrl);
}
