import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";

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
      select: { id: true, role: true },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found.");
    }

    if (
      admin.id === targetUser.id &&
      targetUser.role === "ADMIN" &&
      parsed.data.role !== "ADMIN"
    ) {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        throw new ApiError(400, "You cannot remove the last admin.");
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        passwordSetAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            uploads: true,
            recordings: true,
          },
        },
      },
    });

    return NextResponse.json({
      user: {
        ...user,
        hasPassword: Boolean(user.passwordSetAt),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
