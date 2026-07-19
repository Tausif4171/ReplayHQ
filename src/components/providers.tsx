"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  applyThemePreference,
  getStoredThemePreference,
  isThemePreference,
  storeThemePreference,
} from "@/lib/theme";

function ThemeSync() {
  const { status } = useSession();

  useEffect(() => {
    function applyStoredTheme() {
      applyThemePreference(getStoredThemePreference());
    }

    applyStoredTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyStoredTheme);

    return () => mediaQuery.removeEventListener("change", applyStoredTheme);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function syncUserTheme() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) return;

        const data = await response.json();
        const theme = data.preferences?.theme;

        if (!cancelled && isThemePreference(theme)) {
          storeThemePreference(theme);
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
  }, [status]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
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
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
