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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    const adminUrl = `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/settings/admin`;
    const safeName = escapeHtml(name || "Not provided");
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message || "Not provided");
    const safeAdminUrl = escapeHtml(adminUrl);

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
          `Review this request in Team access: ${adminUrl}`,
        ].join("\n"),
        html: `
          <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h2 style="margin: 0 0 12px; font-size: 20px;">New ReplayHQ access request</h2>
            <p style="margin: 0 0 20px;">A new person requested access to ReplayHQ.</p>
            <table style="margin: 0 0 20px; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 16px 4px 0; color: #6b7280;">Name</td>
                <td style="padding: 4px 0; font-weight: 600;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 16px 4px 0; color: #6b7280;">Email</td>
                <td style="padding: 4px 0;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding: 4px 16px 4px 0; color: #6b7280;">Message</td>
                <td style="padding: 4px 0;">${safeMessage}</td>
              </tr>
            </table>
            <p style="margin: 0 0 20px;">
              <a href="${safeAdminUrl}" style="display: inline-block; border-radius: 8px; background: #4f46e5; color: #ffffff; padding: 10px 14px; text-decoration: none; font-weight: 600;">
                Review request
              </a>
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 13px;">
              Or open Team access: <a href="${safeAdminUrl}" style="color: #4f46e5;">${safeAdminUrl}</a>
            </p>
          </div>
        `,
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
