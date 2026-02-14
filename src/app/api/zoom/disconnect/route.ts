import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await prisma.account.deleteMany({
    where: { userId: session.user.id, provider: "zoom" },
  });

  if (deleted.count === 0) {
    return NextResponse.json(
      { error: "No Zoom account connected" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
