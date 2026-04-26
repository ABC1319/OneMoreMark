import type { ThemeMode } from "../types/models";

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

export function resolveThemeMode(themeMode: ThemeMode, prefersDark: boolean) {
  if (themeMode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return themeMode;
}

export function syncDocumentTheme(themeMode: ThemeMode) {
  const root = document.documentElement;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)") as LegacyMediaQueryList;

  const applyTheme = () => {
    const resolvedTheme = resolveThemeMode(themeMode, mediaQuery.matches);
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  };

  applyTheme();

  if (themeMode !== "system") {
    return () => undefined;
  }

  if ("addEventListener" in mediaQuery && typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", applyTheme);
    return () => {
      mediaQuery.removeEventListener?.("change", applyTheme);
    };
  }

  mediaQuery.addListener?.(applyTheme);
  return () => {
    mediaQuery.removeListener?.(applyTheme);
  };
}
