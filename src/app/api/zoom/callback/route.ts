import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  exchangeCodeForTokens,
  fetchZoomUserProfile,
  verifySignedState,
} from "@/lib/zoom";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?zoom=error&reason=missing_params", request.url)
    );
  }

  try {
    // Verify CSRF state
    const { userId } = verifySignedState(state);

    // Verify the session matches
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.redirect(
        new URL("/settings?zoom=error&reason=auth_mismatch", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch Zoom user profile to get providerAccountId
    const zoomUser = await fetchZoomUserProfile(tokens.access_token);

    // Remove any existing Zoom account for this user (enforce one Zoom per user)
    await prisma.account.deleteMany({
      where: { userId: session.user.id, provider: "zoom" },
    });

    // Create the Zoom account record
    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: "oauth",
        provider: "zoom",
        providerAccountId: zoomUser.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(
      new URL("/settings?zoom=connected", request.url)
    );
  } catch (error) {
    console.error("Zoom OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?zoom=error&reason=callback_failed", request.url)
    );
  }
}
