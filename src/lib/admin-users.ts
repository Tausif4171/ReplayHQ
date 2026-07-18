import type { Prisma } from "@prisma/client";

export const managedUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  passwordSetAt: true,
  suspendedAt: true,
  suspendedById: true,
  suspensionReason: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      accounts: true,
      sessions: true,
      uploads: true,
      recordings: true,
      comments: true,
      bookmarks: true,
      watchHistory: true,
      playlists: true,
    },
  },
} satisfies Prisma.UserSelect;

export type ManagedUserForAdmin = Prisma.UserGetPayload<{
  select: typeof managedUserSelect;
}>;

const removableActivityKeys = [
  "accounts",
  "sessions",
  "uploads",
  "recordings",
  "comments",
  "bookmarks",
  "watchHistory",
  "playlists",
] as const;

export function canRemoveManagedUser(user: ManagedUserForAdmin) {
  return (
    !user.passwordSetAt &&
    removableActivityKeys.every((key) => user._count[key] === 0)
  );
}

export function serializeManagedUser(user: ManagedUserForAdmin) {
  return {
    ...user,
    hasPassword: Boolean(user.passwordSetAt),
    isSuspended: Boolean(user.suspendedAt),
    canRemove: canRemoveManagedUser(user),
  };
}
