import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalRecordings, thisWeekUploads, activeViewers, totalDuration] =
    await Promise.all([
      prisma.recording.count({ where: { status: "READY" } }),
      prisma.recording.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      prisma.watchHistory.groupBy({
        by: ["userId"],
        where: { lastWatchedAt: { gte: weekAgo } },
      }),
      prisma.recording.aggregate({
        where: { status: "READY" },
        _sum: { duration: true },
      }),
    ]);

  const totalWatchTimeHours = Math.round(
    (totalDuration._sum.duration || 0) / 3600
  );

  return NextResponse.json({
    totalRecordings,
    totalWatchTime: totalWatchTimeHours,
    activeViewers: activeViewers.length,
    thisWeekUploads,
  });
}
