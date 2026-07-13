import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { createSecureToken, hashToken } from "@/lib/tokens";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getAppOrigin(origin: string) {
  return process.env.NEXTAUTH_URL || origin;
}

export async function createPasswordResetUrl({
  userId,
  origin,
}: {
  userId: string;
  origin: string;
}) {
  const token = createSecureToken();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  return `${getAppOrigin(origin)}/reset-password?token=${token}`;
}

export async function sendPasswordInstructions({
  email,
  resetUrl,
  mode,
}: {
  email: string;
  resetUrl: string;
  mode: "setup" | "reset";
}) {
  const isSetup = mode === "setup";
  const subject = isSetup
    ? "Set up your ReplayHQ password"
    : "Reset your ReplayHQ password";
  const action = isSetup ? "set up" : "reset";
  const escapedUrl = escapeHtml(resetUrl);

  return sendEmail({
    to: email,
    subject,
    text: `Use this link to ${action} your ReplayHQ password. It expires in 1 hour.\n\n${resetUrl}`,
    html: `<p>Use this link to ${action} your ReplayHQ password. It expires in 1 hour.</p><p><a href="${escapedUrl}">${subject}</a></p>`,
  });
}
