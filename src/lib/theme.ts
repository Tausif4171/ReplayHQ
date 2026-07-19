export const THEME_STORAGE_KEY = "replayhq-theme";
export const THEME_COOKIE_NAME = "replayhq-theme";

export const THEMES = ["dark", "light", "system"] as const;

export type ThemePreference = (typeof THEMES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && THEMES.includes(value as ThemePreference);
}

export function getThemeStorageKey(userId?: string | null): string {
  return userId ? `${THEME_STORAGE_KEY}:${userId}` : THEME_STORAGE_KEY;
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(storedTheme) ? storedTheme : "dark";
}

export function getStoredUserThemePreference(
  userId?: string | null
): ThemePreference | null {
  if (typeof window === "undefined" || !userId) return null;

  const storedTheme = window.localStorage.getItem(getThemeStorageKey(userId));
  return isThemePreference(storedTheme) ? storedTheme : null;
}

export function storeThemePreference(
  theme: ThemePreference,
  userId?: string | null
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);

  if (userId) {
    window.localStorage.setItem(getThemeStorageKey(userId), theme);
  }

  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof window === "undefined") return;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
}
