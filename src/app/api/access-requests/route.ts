import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { isSameOriginRequest } from "@/lib/request";

const AccessRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().email().max(255),
  message: z.string().trim().max(1000).optional(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = AccessRequestSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const name = parsed.data.name?.trim() || null;
  const message = parsed.data.message?.trim() || null;

  const accessRequest = await prisma.accessRequest.upsert({
    where: { email },
    update: {
      name,
      message,
      status: "PENDING",
      requestedRole: "VIEWER",
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    },
    create: {
      email,
      name,
      message,
    },
  });

  const adminEmail = process.env.ACCESS_REQUEST_EMAIL;
  if (adminEmail) {
    try {
      await sendEmail({
        to: adminEmail,
        subject: "New ReplayHQ access request",
        text: [
          "A new ReplayHQ access request was submitted.",
          "",
          `Name: ${name || "Not provided"}`,
          `Email: ${email}`,
          `Message: ${message || "Not provided"}`,
          "",
          "Review this request in ReplayHQ settings: /settings/admin",
        ].join("\n"),
      });
    } catch (error) {
      console.error("Failed to notify admin about access request:", error);
    }
  }

  return NextResponse.json({
    ok: true,
    requestId: accessRequest.id,
    message: "Access request submitted.",
  });
}
