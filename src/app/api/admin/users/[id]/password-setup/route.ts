import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";
import {
  createPasswordResetUrl,
  sendPasswordInstructions,
} from "@/lib/password-reset";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    await requireAdminUser();
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, suspendedAt: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    if (user.suspendedAt) {
      throw new ApiError(
        400,
        "Reactivate this member before sending setup instructions."
      );
    }

    const resetUrl = await createPasswordResetUrl({
      userId: user.id,
      origin: request.nextUrl.origin,
    });

    const setupEmail = await sendPasswordInstructions({
      email: user.email,
      resetUrl,
      mode: "setup",
    });

    return NextResponse.json({ ok: true, setupEmail });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
