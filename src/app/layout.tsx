import type { Metadata } from "next";
import type { Session } from "next-auth";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isThemePreference, THEME_COOKIE_NAME } from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ReplayHQ - Knowledge Replay Platform",
  description:
    "AI-powered internal knowledge replay platform for team recordings",
};

async function getInitialSessionAndTheme(): Promise<{
  session: Session | null;
  theme: ThemePreference;
}> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const fallbackTheme = isThemePreference(cookieTheme) ? cookieTheme : "dark";

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { session, theme: fallbackTheme };
    }

    const preference = await prisma.userPreference.findUnique({
      where: { userId: session.user.id },
      select: { theme: true },
    });

    return {
      session,
      theme: isThemePreference(preference?.theme)
        ? preference.theme
        : fallbackTheme,
    };
  } catch {
    return { session: null, theme: fallbackTheme };
  }
}

function ThemeBootstrapScript({ theme }: { theme: ThemePreference }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(${function applyInitialTheme(initialTheme: string) {
          var theme = initialTheme;
          var prefersDark =
            theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          var shouldUseDark = theme === "dark" || prefersDark;

          document.documentElement.classList.toggle("dark", shouldUseDark);
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.colorScheme = shouldUseDark
            ? "dark"
            : "light";
        }.toString()})(${JSON.stringify(theme)});`,
      }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, theme } = await getInitialSessionAndTheme();
  const shouldUseDarkFallback = theme === "dark" || theme === "system";

  return (
    <html
      lang="en"
      className={`${inter.variable}${shouldUseDarkFallback ? " dark" : ""}`}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <ThemeBootstrapScript theme={theme} />
      </head>
      <body className="font-sans antialiased">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
