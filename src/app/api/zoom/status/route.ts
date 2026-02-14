import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "zoom" },
    select: { providerAccountId: true, scope: true },
  });

  return NextResponse.json({
    connected: !!account,
    zoomAccountId: account?.providerAccountId || null,
  });
}
