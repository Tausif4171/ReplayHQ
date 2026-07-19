"use client";

import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  applyThemePreference,
  getStoredThemePreference,
  getStoredUserThemePreference,
  isThemePreference,
  storeThemePreference,
} from "@/lib/theme";

function ThemeSync() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    function reapplyThemeForSystemChange() {
      const userTheme = getStoredUserThemePreference(userId);
      const theme =
        status === "authenticated" && userTheme
          ? userTheme
          : getStoredThemePreference();

      if (theme === "system") {
        applyThemePreference(theme);
      }
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", reapplyThemeForSystemChange);

    return () =>
      mediaQuery.removeEventListener("change", reapplyThemeForSystemChange);
  }, [status, userId]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      applyThemePreference(getStoredThemePreference());
      return;
    }

    const cachedUserTheme = getStoredUserThemePreference(userId);
    if (cachedUserTheme) {
      applyThemePreference(cachedUserTheme);
    }

    let cancelled = false;

    async function syncUserTheme() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) return;

        const data = await response.json();
        const theme = data.preferences?.theme;

        if (!cancelled && isThemePreference(theme)) {
          storeThemePreference(theme, userId);
          applyThemePreference(theme);
        }
      } catch {
        // Keep the locally stored theme if settings cannot be fetched.
      }
    }

    syncUserTheme();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  return null;
}

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
