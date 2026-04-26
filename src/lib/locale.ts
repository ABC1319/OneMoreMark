import type { LocaleMode, ResolvedLocale } from "../types/models";

export function detectBrowserLocale(): ResolvedLocale {
  if (typeof navigator === "undefined") {
    return "zh-CN";
  }

  const candidates = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  return candidates.some((value) => value.toLowerCase().startsWith("zh")) ? "zh-CN" : "en";
}

export function resolveLocaleMode(localeMode: LocaleMode): ResolvedLocale {
  if (localeMode === "system") {
    return detectBrowserLocale();
  }

  return localeMode;
}

export function getTemporaryCategoryName(locale: ResolvedLocale) {
  return locale === "en" ? "Temporary" : "临时保存";
}
