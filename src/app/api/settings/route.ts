import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ApiError, apiErrorResponse } from "@/lib/api-errors";
import { isSameOriginRequest } from "@/lib/request";

const THEMES = ["dark", "light", "system"] as const;

const DEFAULT_PREFERENCES = {
  theme: "dark",
  notifyAccessRequests: true,
} as const;

const SettingsPatchSchema = z.object({
  profile: z
    .object({
      name: z.string().trim().min(1).max(120),
    })
    .optional(),
  preferences: z
    .object({
      theme: z.enum(THEMES).optional(),
      notifyAccessRequests: z.boolean().optional(),
    })
    .optional(),
});

async function requireActiveUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      passwordSetAt: true,
      suspendedAt: true,
      preference: true,
    },
  });

  if (!user || user.suspendedAt) {
    throw new ApiError(401, "Unauthorized");
  }

  return user;
}

function serializeSettings(user: Awaited<ReturnType<typeof requireActiveUser>>) {
  const preference = user.preference;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      hasPassword: Boolean(user.passwordSetAt),
    },
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(preference
        ? {
            theme: THEMES.includes(preference.theme as (typeof THEMES)[number])
              ? preference.theme
              : DEFAULT_PREFERENCES.theme,
            notifyAccessRequests: preference.notifyAccessRequests,
          }
        : {}),
    },
  };
}

export async function GET() {
  try {
    const user = await requireActiveUser();
    return NextResponse.json(serializeSettings(user));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const user = await requireActiveUser();
    const parsed = SettingsPatchSchema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      throw new ApiError(400, "Invalid settings.");
    }

    const { profile, preferences } = parsed.data;

    if (!profile && !preferences) {
      throw new ApiError(400, "No settings provided.");
    }

    if (profile) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: profile.name },
      });
    }

    if (preferences) {
      await prisma.userPreference.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...DEFAULT_PREFERENCES,
          ...preferences,
        },
        update: preferences,
      });
    }

    const freshUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        passwordSetAt: true,
        suspendedAt: true,
        preference: true,
      },
    });

    return NextResponse.json(serializeSettings(freshUser));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
