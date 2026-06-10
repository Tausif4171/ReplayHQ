import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { setAuthSessionCookie, createSessionToken, getSessionExpiresAt } from "@/lib/auth-session";
import { verifyPassword } from "@/lib/password";
import { isSameOriginRequest } from "@/lib/request";

const SignInSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(256),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = SignInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and password." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const sessionToken = createSessionToken();
  const expires = getSessionExpiresAt();

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  const response = NextResponse.json({ ok: true });
  return setAuthSessionCookie(response, request.nextUrl, sessionToken, expires);
}
