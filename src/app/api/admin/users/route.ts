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
import { managedUserSelect, serializeManagedUser } from "@/lib/admin-users";

const InviteUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional(),
  role: z.nativeEnum(Role).default("VIEWER"),
  note: z.string().trim().max(1000).optional(),
  sendSetupEmail: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const admin = await requireAdminUser();
    const parsed = InviteUserSchema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      throw new ApiError(400, "Invalid invite details.");
    }

    const email = parsed.data.email.toLowerCase();
    const name = parsed.data.name?.trim() || null;
    const note = parsed.data.note?.trim() || null;
    const { role, sendSetupEmail } = parsed.data;

    const [existingUser, existingAccessRequest] = await prisma.$transaction([
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: managedUserSelect,
      }),
      prisma.accessRequest.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      }),
    ]);

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "This email is already a member. Use the Members tab to update role or resend setup.",
          existing: true,
          user: serializeManagedUser(existingUser),
        },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          role,
        },
        select: managedUserSelect,
      });

      const requestData = {
        status: "APPROVED" as const,
        requestedRole: role,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        reviewNote: note || "Invited by admin",
      };

      const accessRequest = existingAccessRequest
        ? await tx.accessRequest.update({
            where: { id: existingAccessRequest.id },
            data: {
              ...requestData,
              name: name ?? undefined,
            },
          })
        : await tx.accessRequest.create({
            data: {
              email,
              name,
              message: null,
              ...requestData,
            },
          });

      return { user, accessRequest };
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

    return NextResponse.json(
      {
        existing: false,
        user: serializeManagedUser(result.user),
        request: result.accessRequest,
        setupEmail,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET() {
  try {
    await requireAdminUser();

    const [users, adminCount, uploaderCount, viewerCount, suspendedCount] =
      await prisma.$transaction([
        prisma.user.findMany({
          orderBy: [
            { suspendedAt: "asc" },
            { role: "asc" },
            { createdAt: "desc" },
          ],
          take: 100,
          select: managedUserSelect,
        }),
        prisma.user.count({ where: { role: "ADMIN", suspendedAt: null } }),
        prisma.user.count({ where: { role: "UPLOADER", suspendedAt: null } }),
        prisma.user.count({ where: { role: "VIEWER", suspendedAt: null } }),
        prisma.user.count({ where: { suspendedAt: { not: null } } }),
      ]);

    return NextResponse.json({
      users: users.map(serializeManagedUser),
      counts: {
        admins: adminCount,
        uploaders: uploaderCount,
        viewers: viewerCount,
        suspended: suspendedCount,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
