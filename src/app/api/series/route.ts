import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const series = await prisma.series.create({
    data: { name: name.trim(), description },
  });

  return NextResponse.json(series, { status: 201 });
}
