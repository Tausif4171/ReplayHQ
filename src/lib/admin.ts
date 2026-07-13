import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api-errors";

export async function requireAdminUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Forbidden");
  }

  return user;
}
