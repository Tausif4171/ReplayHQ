import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";
import {
  createPasswordResetUrl,
  sendPasswordInstructions,
} from "@/lib/password-reset";

const ReviewRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    role: z.nativeEnum(Role).default("VIEWER"),
    reviewNote: z.string().trim().max(1000).optional(),
    sendSetupEmail: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("reject"),
    reviewNote: z.string().trim().max(1000).optional(),
  }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const admin = await requireAdminUser();
    const { id } = await params;
    const parsed = ReviewRequestSchema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      throw new ApiError(400, "Invalid request.");
    }

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!accessRequest) {
      throw new ApiError(404, "Access request not found.");
    }

    if (parsed.data.action === "reject") {
      const updated = await prisma.accessRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedById: admin.id,
          reviewNote: parsed.data.reviewNote || null,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
      });

      return NextResponse.json({ request: updated });
    }

    const { role, reviewNote, sendSetupEmail } = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: accessRequest.email },
        select: { id: true, name: true, email: true },
      });

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
          data: {
            name: existingUser.name || accessRequest.name || undefined,
            role,
            suspendedAt: null,
            suspendedById: null,
            suspensionReason: null,
          },
          select: { id: true, email: true },
        })
        : await tx.user.create({
            data: {
              email: accessRequest.email,
              name: accessRequest.name,
              role,
            },
            select: { id: true, email: true },
          });

      const updatedRequest = await tx.accessRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          requestedRole: role,
          reviewedAt: new Date(),
          reviewedById: admin.id,
          reviewNote: reviewNote || null,
        },
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
      });

      return { user, request: updatedRequest };
    });

    let setupEmail:
      | { delivered: boolean; reason?: string }
      | { delivered: false; reason: "skipped" } = {
      delivered: false,
      reason: "skipped",
    };

    if (sendSetupEmail) {
      const resetUrl = await createPasswordResetUrl({
        userId: result.user.id,
        origin: request.nextUrl.origin,
      });

      setupEmail = await sendPasswordInstructions({
        email: result.user.email,
        resetUrl,
        mode: "setup",
      });
    }

    return NextResponse.json({
      request: result.request,
      user: result.user,
      setupEmail,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
