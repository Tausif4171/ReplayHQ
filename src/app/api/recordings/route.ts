import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const seriesId = searchParams.get("series") || "";
  const tag = searchParams.get("tag") || "";
  const sort = searchParams.get("sort") || "newest";

  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (seriesId) {
    where.seriesId = seriesId;
  }

  if (tag) {
    where.tags = { some: { name: tag } };
  }

  const orderBy: any = sort === "oldest"
    ? { createdAt: "asc" }
    : sort === "popular"
    ? { watchHistory: { _count: "desc" } }
    : { createdAt: "desc" };

  const [recordings, total] = await Promise.all([
    prisma.recording.findMany({
      where,
      include: {
        presenter: { select: { id: true, name: true, image: true, role: true } },
        series: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true } },
        _count: { select: { watchHistory: true, comments: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.recording.count({ where }),
  ]);

  return NextResponse.json({
    recordings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, seriesId, tags, videoUrl, duration } = body;

  if (!title || !videoUrl) {
    return NextResponse.json(
      { error: "Title and videoUrl are required" },
      { status: 400 }
    );
  }

  const recording = await prisma.recording.create({
    data: {
      title,
      description,
      videoUrl,
      duration,
      status: "PROCESSING",
      uploadedById: session.user.id,
      presenterId: session.user.id,
      seriesId: seriesId || undefined,
      tags: tags?.length
        ? {
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          }
        : undefined,
    },
    include: {
      presenter: { select: { id: true, name: true, image: true, role: true } },
      series: { select: { id: true, name: true } },
      tags: true,
    },
  });

  return NextResponse.json(recording, { status: 201 });
}
