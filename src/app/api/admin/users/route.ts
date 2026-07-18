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
          user: {
            ...existingUser,
            hasPassword: Boolean(existingUser.passwordSetAt),
          },
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
        user: {
          ...result.user,
          hasPassword: Boolean(result.user.passwordSetAt),
        },
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

    const [users, adminCount, uploaderCount, viewerCount] =
      await prisma.$transaction([
        prisma.user.findMany({
          orderBy: [{ role: "asc" }, { createdAt: "desc" }],
          take: 100,
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
        }),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { role: "UPLOADER" } }),
        prisma.user.count({ where: { role: "VIEWER" } }),
      ]);

    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        hasPassword: Boolean(user.passwordSetAt),
      })),
      counts: {
        admins: adminCount,
        uploaders: uploaderCount,
        viewers: viewerCount,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
