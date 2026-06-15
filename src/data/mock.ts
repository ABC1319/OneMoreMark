import type { AppState, LocaleMode, ResolvedLocale } from "../types/models";

export function createMockState(locale: ResolvedLocale = "zh-CN", localeMode: LocaleMode = "system"): AppState {
  const isEnglish = locale === "en";

  return {
    sidebarCollapsed: false,
    themeMode: "system",
    localeMode,
    categories: [{ id: "c1", name: isEnglish ? "Default" : "默认分类", order: 0 }],
    bookmarks: [
      {
        id: "b1",
        title: isEnglish ? "Google Search" : "谷歌搜索",
        url: "https://www.google.com",
        icon: "",
        categoryId: "c1",
        order: 0
      },
      {
        id: "b2",
        title: isEnglish ? "DeepSeek Official" : "DeepSeek 官网",
        url: "https://www.deepseek.com",
        icon: "",
        categoryId: "c1",
        order: 1
      },
      {
        id: "b3",
        title: isEnglish ? "OpenAI Official" : "OpenAI 官网",
        url: "https://openai.com",
        icon: "",
        categoryId: "c1",
        order: 2
      }
    ]
  };
}

export const mockState: AppState = createMockState("zh-CN");
