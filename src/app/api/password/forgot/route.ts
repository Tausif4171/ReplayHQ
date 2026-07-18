import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/request";
import {
  createPasswordResetUrl,
  sendPasswordInstructions,
} from "@/lib/password-reset";

const ForgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
    select: { id: true, email: true, suspendedAt: true },
  });

  if (user && !user.suspendedAt) {
    const resetUrl = await createPasswordResetUrl({
      userId: user.id,
      origin: request.nextUrl.origin,
    });

    try {
      await sendPasswordInstructions({
        email: user.email,
        resetUrl,
        mode: "reset",
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
