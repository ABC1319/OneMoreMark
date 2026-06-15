export type ThemeMode = "light" | "dark" | "system";
export type LocaleMode = "system" | "zh-CN" | "en";
export type ResolvedLocale = "zh-CN" | "en";

export type Category = {
  id: string;
  name: string;
  order: number;
};

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  icon: string;
  categoryId: string;
  order: number;
};

export type FeaturedLinkConfig = {
  enabled: boolean;
  showRedDot: boolean;
  locales: Record<ResolvedLocale, {
    text: string;
    url: string;
  }>;
  version: string;
};

export type RecommendedBookmarkConfig = {
  title: string;
  url: string;
  icon: string;
};

export type AppState = {
  sidebarCollapsed: boolean;
  themeMode: ThemeMode;
  localeMode: LocaleMode;
  categories: Category[];
  bookmarks: Bookmark[];
};
