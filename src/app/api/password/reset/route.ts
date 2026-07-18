import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, isStrongEnoughPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { hashToken } from "@/lib/tokens";
import { isSameOriginRequest } from "@/lib/request";

const ResetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = ResetPasswordSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success || !isStrongEnoughPassword(parsed.data.password)) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashToken(parsed.data.token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          suspendedAt: true,
        },
      },
    },
  });

  if (!resetToken) {
    return NextResponse.json(
      { error: "This reset link is invalid or expired." },
      { status: 400 }
    );
  }

  if (resetToken.user.suspendedAt) {
    return NextResponse.json(
      { error: "This account no longer has ReplayHQ access." },
      { status: 403 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        passwordSetAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
