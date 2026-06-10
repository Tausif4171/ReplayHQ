import { NextResponse } from "next/server";
import { createSecureToken } from "@/lib/tokens";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function shouldUseSecureCookie(requestUrl: URL) {
  return (
    requestUrl.protocol === "https:" ||
    process.env.NEXTAUTH_URL?.startsWith("https://") ||
    process.env.VERCEL === "1"
  );
}

export function createSessionToken() {
  return createSecureToken();
}

export function getSessionExpiresAt() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

export function setAuthSessionCookie(
  response: NextResponse,
  requestUrl: URL,
  sessionToken: string,
  expires: Date
) {
  const secure = shouldUseSecureCookie(requestUrl);

  response.cookies.set({
    name: secure ? "__Secure-authjs.session-token" : "authjs.session-token",
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires,
  });

  return response;
}
