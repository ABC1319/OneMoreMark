import type { Bookmark } from "../types/models";

export const MAX_CUSTOM_ICON_LENGTH = 500;

export function originFromUrl(url: string) {
  try {
    const { origin } = new URL(url);
    return origin;
  } catch {
    return "";
  }
}

export function normalizeStoredIcon(url: string, icon: string) {
  const value = icon.trim();
  if (!value || value.length > MAX_CUSTOM_ICON_LENGTH || /^data:image\//i.test(value)) {
    return "";
  }

  if (!/^https?:\/\//i.test(value)) {
    return "";
  }

  return value === `${originFromUrl(url)}/favicon.ico` ? "" : value;
}

export function chromeFaviconUrl(pageUrl: string, size = 32) {
  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) {
    return "";
  }

  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
  faviconUrl.searchParams.set("pageUrl", pageUrl);
  faviconUrl.searchParams.set("size", String(size));
  return faviconUrl.toString();
}

export function getBookmarkIconSources(bookmark: Bookmark) {
  const pageUrl = originFromUrl(bookmark.url) || bookmark.url;
  const customIcon = normalizeStoredIcon(bookmark.url, bookmark.icon);
  const autoIcon = chromeFaviconUrl(pageUrl, 32);

  return {
    customIcon,
    autoIcon
  };
}
