import type { FeaturedLinkConfig, RecommendedBookmarkConfig } from "../types/models";

const FEATURED_LINK_CACHE_KEY = "tabcard_featured_link_config";
const FEATURED_LINK_CLICKED_VERSION_KEY = "tabcard_featured_link_clicked_version";
const DEFAULT_FEATURED_LINK_CONFIG_URL =
  "https://onemoremark.pages.dev/chromeExtensionConfig.json";
const DEFAULT_FEATURED_LINK_LOCALES = {
  "zh-CN": {
    text: "更多精彩",
    url: "https://onemoremark.pages.dev/zh/"
  },
  en: {
    text: "More",
    url: "https://onemoremark.pages.dev/en/"
  }
};

export const FEATURED_LINK_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const FEATURED_LINK_CONFIG_URL =
  import.meta.env.VITE_FEATURED_LINK_CONFIG_URL ?? DEFAULT_FEATURED_LINK_CONFIG_URL;

function hasChromeLocalStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

function readLocalStorageItem<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

async function getStoredValue<T>(key: string): Promise<T | null> {
  if (hasChromeLocalStorage()) {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T | undefined) ?? readLocalStorageItem<T>(key);
  }

  return readLocalStorageItem<T>(key);
}

async function setStoredValue(key: string, value: unknown) {
  writeLocalStorageItem(key, value);

  if (hasChromeLocalStorage()) {
    await chrome.storage.local.set({ [key]: value });
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeFeaturedLink(value: unknown): FeaturedLinkConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<FeaturedLinkConfig>;
  const enabled = Boolean(record.enabled);
  if (!enabled) {
    return {
      enabled: false,
      showRedDot: false,
      locales: DEFAULT_FEATURED_LINK_LOCALES,
      version: typeof record.version === "string" ? record.version : ""
    };
  }

  if (typeof record.version !== "string") {
    return null;
  }

  const version = record.version.trim();
  if (!version) {
    return null;
  }

  const legacyText = typeof record.text === "string" ? record.text.trim() : "";
  const legacyUrl = typeof record.url === "string" ? record.url.trim() : "";
  const localeRecord = "locales" in record && record.locales && typeof record.locales === "object"
    ? record.locales as Record<string, unknown>
    : {};
  const hasExplicitLocales = Boolean(localeRecord["zh-CN"] || localeRecord.en);

  function normalizeLocale(locale: "zh-CN" | "en") {
    const localeValue = localeRecord[locale];
    const localeConfig = localeValue && typeof localeValue === "object"
      ? localeValue as { text?: unknown; url?: unknown }
      : {};
    const fallback = DEFAULT_FEATURED_LINK_LOCALES[locale];
    const text = typeof localeConfig.text === "string"
      ? localeConfig.text.trim()
      : hasExplicitLocales
        ? fallback.text
        : legacyText || fallback.text;
    const url = typeof localeConfig.url === "string"
      ? localeConfig.url.trim()
      : hasExplicitLocales
        ? fallback.url
        : legacyUrl || fallback.url;

    if (!text || !url || !isHttpUrl(url)) {
      return null;
    }

    return { text, url };
  }

  const zhCN = normalizeLocale("zh-CN");
  const en = normalizeLocale("en");
  if (!zhCN || !en) {
    return null;
  }

  return {
    enabled: true,
    showRedDot: Boolean(record.showRedDot),
    locales: {
      "zh-CN": zhCN,
      en
    },
    version
  };
}

function extractFeaturedLink(value: unknown): FeaturedLinkConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as { featuredLink?: unknown };
  return normalizeFeaturedLink(record.featuredLink ?? value);
}

function normalizeRecommendedBookmark(value: unknown): RecommendedBookmarkConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<RecommendedBookmarkConfig>;
  if (typeof record.title !== "string" || typeof record.url !== "string") {
    return null;
  }

  const title = record.title.trim();
  const url = record.url.trim();
  if (!title || !url || !isHttpUrl(url)) {
    return null;
  }

  return {
    title,
    url,
    icon: typeof record.icon === "string" ? record.icon : ""
  };
}

function extractRecommendedBookmarks(value: unknown): RecommendedBookmarkConfig[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as { recommendedBookmarks?: unknown };
  if (!Array.isArray(record.recommendedBookmarks)) {
    return [];
  }

  const seenUrls = new Set<string>();
  return record.recommendedBookmarks
    .map(normalizeRecommendedBookmark)
    .filter((item): item is RecommendedBookmarkConfig => Boolean(item))
    .filter((item) => {
      const key = item.url.toLowerCase();
      if (seenUrls.has(key)) {
        return false;
      }
      seenUrls.add(key);
      return true;
    });
}

export async function loadCachedFeaturedLinkConfig() {
  const cached = await getStoredValue<unknown>(FEATURED_LINK_CACHE_KEY);
  return extractFeaturedLink(cached);
}

export async function fetchFeaturedLinkConfig() {
  if (!FEATURED_LINK_CONFIG_URL) {
    return loadCachedFeaturedLinkConfig();
  }

  const response = await fetch(FEATURED_LINK_CONFIG_URL, {
    cache: "no-cache"
  });

  if (!response.ok) {
    throw new Error("Failed to load featured link config.");
  }

  const config = extractFeaturedLink(await response.json());
  await setStoredValue(FEATURED_LINK_CACHE_KEY, config);
  return config;
}

export async function fetchRecommendedBookmarksConfig() {
  if (!FEATURED_LINK_CONFIG_URL) {
    return [];
  }

  const response = await fetch(FEATURED_LINK_CONFIG_URL, {
    cache: "no-cache"
  });

  if (!response.ok) {
    return [];
  }

  return extractRecommendedBookmarks(await response.json());
}

export async function loadClickedFeaturedLinkVersion() {
  const value = await getStoredValue<unknown>(FEATURED_LINK_CLICKED_VERSION_KEY);
  return typeof value === "string" ? value : null;
}

export async function markFeaturedLinkClicked(version: string) {
  await setStoredValue(FEATURED_LINK_CLICKED_VERSION_KEY, version);
}
