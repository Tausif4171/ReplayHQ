import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";
import {
  canRemoveManagedUser,
  managedUserSelect,
  serializeManagedUser,
} from "@/lib/admin-users";

const UpdateUserSchema = z.object({
  role: z.nativeEnum(Role),
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
    const parsed = UpdateUserSchema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      throw new ApiError(400, "Invalid request.");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, suspendedAt: true },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found.");
    }

    if (
      admin.id === targetUser.id &&
      targetUser.role === "ADMIN" &&
      !targetUser.suspendedAt &&
      parsed.data.role !== "ADMIN"
    ) {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", suspendedAt: null },
      });
      if (adminCount <= 1) {
        throw new ApiError(400, "You cannot remove the last admin.");
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: managedUserSelect,
    });

    return NextResponse.json({
      user: serializeManagedUser(user),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const admin = await requireAdminUser();
    const { id } = await params;

    if (admin.id === id) {
      throw new ApiError(400, "You cannot remove your own account.");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: managedUserSelect,
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found.");
    }

    if (targetUser.role === "ADMIN" && !targetUser.suspendedAt) {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", suspendedAt: null },
      });

      if (adminCount <= 1) {
        throw new ApiError(400, "You cannot remove the last admin.");
      }
    }

    if (!canRemoveManagedUser(targetUser)) {
      throw new ApiError(
        400,
        "Suspend this member instead. Members with sign-in history or content are kept for audit."
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
