import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api-errors";
import { canUploadRecordings } from "@/lib/roles";

export async function requireActiveUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, suspendedAt: true },
  });

  if (!user || user.suspendedAt) {
    throw new ApiError(401, "Unauthorized");
  }

  return user;
}

export async function requireUploaderUser() {
  const user = await requireActiveUser();

  if (!canUploadRecordings(user.role)) {
    throw new ApiError(403, "Uploader access required.");
  }

  return user;
}
