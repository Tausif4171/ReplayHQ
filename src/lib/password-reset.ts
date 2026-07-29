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
  const intro = isSetup
    ? "Your ReplayHQ account is ready. Use this secure link to set up your password. It expires in 1 hour."
    : "Use this secure link to reset your ReplayHQ password. It expires in 1 hour.";
  const escapedUrl = escapeHtml(resetUrl);
  const escapedSubject = escapeHtml(subject);
  const escapedIntro = escapeHtml(intro);

  return sendEmail({
    to: email,
    subject,
    text: [
      intro,
      "",
      `${subject}: ${resetUrl}`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin: 0 0 12px; font-size: 20px;">${escapedSubject}</h2>
        <p style="margin: 0 0 20px;">${escapedIntro}</p>
        <p style="margin: 0 0 20px;">
          <a href="${escapedUrl}" style="display: inline-block; border-radius: 8px; background: #4f46e5; color: #ffffff; padding: 10px 14px; text-decoration: none; font-weight: 600;">
            ${escapedSubject}
          </a>
        </p>
        <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">
          Button not working? Open this link: <a href="${escapedUrl}" style="color: #4f46e5;">${escapedUrl}</a>
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 13px;">
          If you did not request this, you can ignore this email.
        </p>
      </div>
    `,
  });
}
