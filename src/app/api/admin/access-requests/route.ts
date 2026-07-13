import { NextRequest, NextResponse } from "next/server";
import { AccessRequestStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { apiErrorResponse } from "@/lib/api-errors";

const VALID_STATUSES = new Set<string>(Object.values(AccessRequestStatus));

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();

    const status = request.nextUrl.searchParams.get("status");
    const where =
      status && VALID_STATUSES.has(status)
        ? { status: status as AccessRequestStatus }
        : undefined;

    const [
      requests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalUsers,
      adminUsers,
    ] =
      await prisma.$transaction([
        prisma.accessRequest.findMany({
          where,
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 100,
          include: {
            reviewedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.accessRequest.count({ where: { status: "PENDING" } }),
        prisma.accessRequest.count({ where: { status: "APPROVED" } }),
        prisma.accessRequest.count({ where: { status: "REJECTED" } }),
        prisma.user.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
      ]);

    const emails = requests.map((item) => item.email);
    const users = emails.length
      ? await prisma.user.findMany({
          where: { OR: emails.map((email) => ({ email })) },
          select: {
            id: true,
            email: true,
            role: true,
            passwordSetAt: true,
          },
        })
      : [];
    const usersByEmail = new Map(users.map((user) => [user.email, user]));

    return NextResponse.json({
      requests: requests.map((item) => {
        const user = usersByEmail.get(item.email);
        return {
          ...item,
          existingUser: user
            ? {
                id: user.id,
                role: user.role,
                hasPassword: Boolean(user.passwordSetAt),
              }
            : null,
        };
      }),
      counts: {
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        users: totalUsers,
        admins: adminUsers,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
