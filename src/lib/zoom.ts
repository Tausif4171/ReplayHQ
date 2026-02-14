import crypto from "crypto";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ZOOM_AUTH_URL = "https://zoom.us/oauth/authorize";
const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";
const ZOOM_SCOPES = "cloud_recording:read:list_user_recordings:admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string; // "MP4", "M4A", "CHAT", "TRANSCRIPT", etc.
  file_size: number;
  download_url: string;
  play_url: string;
  status: string;
  recording_type: string; // "shared_screen_with_speaker_view", "active_speaker", etc.
}

export interface ZoomMeeting {
  uuid: string;
  id: number;
  topic: string;
  start_time: string;
  duration: number; // minutes
  total_size: number;
  recording_count: number;
  type: number;
  recording_files: ZoomRecordingFile[];
}

export interface ZoomRecordingListResponse {
  from: string;
  to: string;
  page_size: number;
  total_records: number;
  next_page_token: string;
  meetings: ZoomMeeting[];
}

export interface ZoomUserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  pic_url: string;
}

// Simplified types for the frontend (no download URLs exposed)
export interface ZoomMeetingSummary {
  id: string; // uuid
  meetingId: number;
  topic: string;
  startTime: string;
  duration: number; // minutes
  totalSize: number;
  recordingFiles: ZoomFileSummary[];
}

export interface ZoomFileSummary {
  id: string;
  fileType: string;
  fileSize: number;
  recordingType: string;
  recordingStart: string;
  recordingEnd: string;
}

// ---------------------------------------------------------------------------
// OAuth Flow Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the Zoom OAuth authorization URL.
 */
export function getZoomAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ZOOM_CLIENT_ID!,
    redirect_uri: process.env.ZOOM_REDIRECT_URI!,
    state,
  });

  return `${ZOOM_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access + refresh tokens.
 * Zoom requires Basic auth: base64(client_id:client_secret).
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<ZoomTokenResponse> {
  const basicAuth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(ZOOM_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.ZOOM_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token exchange failed: ${res.status} ${err}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

/**
 * Retrieves the Zoom Account record for a user from the database.
 */
export async function getZoomAccount(userId: string) {
  return prisma.account.findFirst({
    where: { userId, provider: "zoom" },
  });
}

/**
 * Refreshes an expired Zoom access token.
 * Zoom rotates refresh tokens on every refresh — must persist immediately.
 */
export async function refreshZoomToken(userId: string): Promise<string> {
  const account = await getZoomAccount(userId);
  if (!account || !account.refresh_token) {
    throw new Error("No Zoom account or refresh token found");
  }

  const basicAuth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(ZOOM_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token refresh failed: ${res.status} ${err}`);
  }

  const tokens: ZoomTokenResponse = await res.json();

  // Persist new tokens immediately (Zoom invalidates old refresh token)
  await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    data: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    },
  });

  return tokens.access_token;
}

/**
 * Gets a valid access token, auto-refreshing if expired.
 * This is the single entry point for all Zoom API calls.
 */
export async function getValidZoomToken(userId: string): Promise<string> {
  const account = await getZoomAccount(userId);
  if (!account || !account.access_token) {
    throw new Error("No Zoom account connected");
  }

  const now = Math.floor(Date.now() / 1000);
  // Refresh if token expires within 5 minutes
  if (account.expires_at && account.expires_at < now + 300) {
    return refreshZoomToken(userId);
  }

  return account.access_token;
}

// ---------------------------------------------------------------------------
// Zoom API Wrappers
// ---------------------------------------------------------------------------

/**
 * Fetches the Zoom user profile. Used during callback to get providerAccountId.
 */
export async function fetchZoomUserProfile(
  accessToken: string
): Promise<ZoomUserProfile> {
  const res = await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Zoom user profile: ${res.status}`);
  }

  return res.json();
}

/**
 * Lists the user's Zoom cloud recordings.
 */
export async function listZoomRecordings(
  userId: string,
  from: string,
  to: string,
  pageSize = 30,
  nextPageToken?: string
): Promise<ZoomRecordingListResponse> {
  const token = await getValidZoomToken(userId);

  const params = new URLSearchParams({
    from,
    to,
    page_size: String(pageSize),
  });
  if (nextPageToken) {
    params.set("next_page_token", nextPageToken);
  }

  const res = await fetch(
    `${ZOOM_API_BASE}/users/me/recordings?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    // If 401, try refreshing once and retry
    if (res.status === 401) {
      const newToken = await refreshZoomToken(userId);
      const retryRes = await fetch(
        `${ZOOM_API_BASE}/users/me/recordings?${params.toString()}`,
        { headers: { Authorization: `Bearer ${newToken}` } }
      );
      if (!retryRes.ok) {
        throw new Error(
          `Zoom recordings API failed after refresh: ${retryRes.status}`
        );
      }
      return retryRes.json();
    }
    throw new Error(`Zoom recordings API failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetches recording details for a specific meeting (includes download URLs).
 */
export async function fetchMeetingRecordings(
  userId: string,
  meetingUuid: string
): Promise<ZoomMeeting> {
  const token = await getValidZoomToken(userId);

  // Double-encode the UUID if it starts with / or contains //
  const encodedUuid = meetingUuid.startsWith("/") || meetingUuid.includes("//")
    ? encodeURIComponent(encodeURIComponent(meetingUuid))
    : encodeURIComponent(meetingUuid);

  const res = await fetch(
    `${ZOOM_API_BASE}/meetings/${encodedUuid}/recordings`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    if (res.status === 401) {
      const newToken = await refreshZoomToken(userId);
      const retryRes = await fetch(
        `${ZOOM_API_BASE}/meetings/${encodedUuid}/recordings`,
        { headers: { Authorization: `Bearer ${newToken}` } }
      );
      if (!retryRes.ok) {
        throw new Error(
          `Zoom meeting recordings API failed after refresh: ${retryRes.status}`
        );
      }
      return retryRes.json();
    }
    throw new Error(`Zoom meeting recordings API failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Gets a download URL with access token appended.
 */
export async function getZoomDownloadUrl(
  userId: string,
  downloadUrl: string
): Promise<string> {
  const token = await getValidZoomToken(userId);
  return `${downloadUrl}?access_token=${token}`;
}

// ---------------------------------------------------------------------------
// CSRF State Helpers (signed with NEXTAUTH_SECRET)
// ---------------------------------------------------------------------------

interface StatePayload {
  userId: string;
  ts: number;
  nonce: string;
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

/**
 * Generates a signed state parameter for CSRF protection.
 */
export function generateSignedState(userId: string): string {
  const payload: StatePayload = {
    userId,
    ts: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(json);
  return `${json}.${signature}`;
}

/**
 * Verifies and decodes the signed state parameter.
 * Throws if invalid or expired (>10 minutes).
 */
export function verifySignedState(state: string): StatePayload {
  const [json, signature] = state.split(".");
  if (!json || !signature) {
    throw new Error("Invalid state format");
  }

  const expectedSig = sign(json);
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    )
  ) {
    throw new Error("Invalid state signature");
  }

  const payload: StatePayload = JSON.parse(
    Buffer.from(json, "base64url").toString()
  );

  // Check if state is fresh (< 10 minutes)
  if (Date.now() - payload.ts > 10 * 60 * 1000) {
    throw new Error("State expired");
  }

  return payload;
}
