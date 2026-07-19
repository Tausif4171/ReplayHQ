export const THEME_STORAGE_KEY = "replayhq-theme";

export const THEMES = ["dark", "light", "system"] as const;

export type ThemePreference = (typeof THEMES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && THEMES.includes(value as ThemePreference);
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(storedTheme) ? storedTheme : "dark";
}

export function storeThemePreference(theme: ThemePreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof window === "undefined") return;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", shouldUseDark);
}
