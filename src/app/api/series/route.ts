import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUploaderUser } from "@/lib/access";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";

export async function GET() {
  const series = await prisma.series.findMany({
    include: {
      _count: { select: { recordings: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(series);
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    await requireUploaderUser();
    const { name, description } = await request.json();

    if (!name?.trim()) {
      throw new ApiError(400, "Name is required");
    }

    const series = await prisma.series.create({
      data: { name: name.trim(), description },
    });

    return NextResponse.json(series, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
