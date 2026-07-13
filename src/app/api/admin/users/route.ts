import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { apiErrorResponse } from "@/lib/api-errors";

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
