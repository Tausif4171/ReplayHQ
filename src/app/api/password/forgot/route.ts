import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { createSecureToken, hashToken } from "@/lib/tokens";
import { isSameOriginRequest } from "@/lib/request";

const ForgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAppOrigin(request: NextRequest) {
  return process.env.NEXTAUTH_URL || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = ForgotPasswordSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  let debugResetUrl: string | undefined;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  if (user) {
    const token = createSecureToken();
    const resetUrl = `${getAppOrigin(request)}/reset-password?token=${token}`;

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your ReplayHQ password",
        text: `Use this link to reset your ReplayHQ password. It expires in 1 hour.\n\n${resetUrl}`,
        html: `<p>Use this link to reset your ReplayHQ password. It expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
      });
    } catch (error) {
      console.error("Failed to send password reset email:", error);
    }

    if (process.env.NODE_ENV !== "production") {
      debugResetUrl = resetUrl;
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an approved account exists for that email, password setup instructions have been sent.",
    debugResetUrl,
  });
}
