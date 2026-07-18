import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";
import { managedUserSelect, serializeManagedUser } from "@/lib/admin-users";

const UpdateAccessSchema = z.object({
  action: z.enum(["suspend", "reactivate"]),
  reason: z.string().trim().max(1000).optional(),
});

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
    const parsed = UpdateAccessSchema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      throw new ApiError(400, "Invalid request.");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        suspendedAt: true,
      },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found.");
    }

    if (admin.id === targetUser.id && parsed.data.action === "suspend") {
      throw new ApiError(400, "You cannot suspend your own account.");
    }

    if (parsed.data.action === "suspend") {
      if (targetUser.role === "ADMIN" && !targetUser.suspendedAt) {
        const adminCount = await prisma.user.count({
          where: { role: "ADMIN", suspendedAt: null },
        });

        if (adminCount <= 1) {
          throw new ApiError(400, "You cannot suspend the last admin.");
        }
      }

      const now = new Date();
      const user = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: targetUser.id },
          data: {
            suspendedAt: targetUser.suspendedAt || now,
            suspendedById: admin.id,
            suspensionReason: parsed.data.reason?.trim() || null,
          },
          select: managedUserSelect,
        });

        await tx.session.deleteMany({ where: { userId: targetUser.id } });
        await tx.passwordResetToken.updateMany({
          where: {
            userId: targetUser.id,
            usedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        });

        return updatedUser;
      });

      return NextResponse.json({ user: serializeManagedUser(user) });
    }

    const user = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        suspendedAt: null,
        suspendedById: null,
        suspensionReason: null,
      },
      select: managedUserSelect,
    });

    return NextResponse.json({ user: serializeManagedUser(user) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
