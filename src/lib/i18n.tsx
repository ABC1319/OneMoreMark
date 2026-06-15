import { createContext, useContext, useMemo, type ReactNode } from "react";

import { resolveLocaleMode } from "./locale";
import type { LocaleMode, ResolvedLocale, ThemeMode } from "../types/models";

const messages = {
  "zh-CN": {
    common: {
      edit: "编辑",
      delete: "删除",
      cancel: "取消",
      save: "保存",
      close: "关闭"
    },
    toolbar: {
      collapseAll: "全部合起",
      expandAll: "全部展开",
      export: "导出",
      import: "导入",
      syncStatus: "同步状态",
      theme: "主题",
      language: "语言",
      searchPlaceholder: "搜索标题或网址"
    },
    sync: {
      title: "同步状态",
      description: "查看本地与云端的当前状态，也可以在这里手动发起一次同步。",
      localUpdatedAt: "本地最近更新时间",
      cloudStatus: "云端状态",
      cloudUpdatedAt: "云端最近更新时间",
      connected: "已连接",
      noCloudData: "暂无云端数据",
      unavailable: "当前未连接 Chrome 同步，你仍可通过导出和导入来备份或迁移收藏",
      oversized: "空间不足，仅保存在本机",
      chunks: "分片",
      size: "大小",
      rawKeys: "云端键数量",
      format: "格式",
      chunkFormat: "新版分片",
      legacyFormat: "旧版数据",
      noneFormat: "无数据",
      syncNow: "同步云端",
      noTime: "暂无",
      toastUploaded: "同步成功",
      toastDownloaded: "同步成功，已更新本地数据",
      toastLatest: "已是最新",
      toastQuota: "收藏较多，已保存在本机，Chrome 同步空间不足，可选择手动导出和导入",
      toastUnavailable: "同步失败，Chrome 同步不可用",
      toastFailed: "同步失败，请稍后重试",
      syncing: "同步中..."
    },
    theme: {
      title: "主题",
      description: "选择你希望使用的界面外观。",
      options: {
        light: { label: "浅色", description: "始终使用浅色外观" },
        dark: { label: "深色", description: "始终使用深色外观" },
        system: { label: "跟随浏览器", description: "跟随浏览器当前的明暗外观" }
      }
    },
    language: {
      title: "语言",
      description: "选择你希望使用的界面语言。",
      options: {
        system: { label: "跟随浏览器", description: "根据浏览器当前语言自动切换" },
        "zh-CN": { label: "简体中文", description: "始终使用简体中文界面" },
        en: { label: "English", description: "Always use English in the interface" }
      }
    },
    sidebar: {
      brand: "OneMoreMark"
    },
    content: {
      importSuccess: "导入成功",
      noSearchResult: "没有找到匹配的网站",
      closeSyncWarning: "关闭同步空间不足提醒"
    },
    popup: {
      saved: "已收藏，点击可取消收藏",
      unsaved: "未收藏，点击可收藏",
      saveAllTabs: "一键保存全部标签页并关闭",
      addCategoryPlaceholder: "新增分类"
    },
    bookmarkEdit: {
      title: "编辑网站",
      description: "修改名称、网站链接和自定义 Icon 链接。",
      name: "网站名称",
      url: "网站链接",
      icon: "Icon 链接",
      iconPlaceholder: "可选，仅支持 http/https 图片链接",
      iconHelp: "可选，仅保存自定义图标链接，最多 {max} 个字符。"
    },
    deleteCategory: {
      title: "删除分类",
      description: "删除“{name}”后，该分类内的 {count} 个网站收藏也会一并删除。此操作不可恢复，确认继续吗？",
      confirm: "确认删除"
    }
  },
  en: {
    common: {
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      save: "Save",
      close: "Close"
    },
    toolbar: {
      collapseAll: "Collapse all",
      expandAll: "Expand all",
      export: "Export",
      import: "Import",
      syncStatus: "Sync status",
      theme: "Theme",
      language: "Language",
      searchPlaceholder: "Search title or URL"
    },
    sync: {
      title: "Sync Status",
      description: "Check the current local and cloud state, and start a sync here if needed.",
      localUpdatedAt: "Local last updated",
      cloudStatus: "Cloud status",
      cloudUpdatedAt: "Cloud last updated",
      connected: "Connected",
      noCloudData: "No cloud data yet",
      unavailable: "Chrome Sync is currently unavailable. You can still back up or migrate your bookmarks by exporting and importing.",
      oversized: "Storage limit exceeded, saved locally only",
      chunks: "Chunks",
      size: "Size",
      rawKeys: "Cloud keys",
      format: "Format",
      chunkFormat: "Chunked",
      legacyFormat: "Legacy",
      noneFormat: "None",
      syncNow: "Sync now",
      noTime: "N/A",
      toastUploaded: "Sync completed",
      toastDownloaded: "Sync completed, local data updated",
      toastLatest: "Already up to date",
      toastQuota: "There are too many bookmarks to sync. They are still saved locally, and you can export/import them manually.",
      toastUnavailable: "Sync failed, Chrome Sync is unavailable",
      toastFailed: "Sync failed, please try again later",
      syncing: "Syncing..."
    },
    theme: {
      title: "Theme",
      description: "Choose the appearance you want to use.",
      options: {
        light: { label: "Light", description: "Always use the light appearance" },
        dark: { label: "Dark", description: "Always use the dark appearance" },
        system: { label: "Follow browser", description: "Match the browser appearance automatically" }
      }
    },
    language: {
      title: "Language",
      description: "Choose the interface language you want to use.",
      options: {
        system: { label: "Follow browser", description: "Automatically match the browser language" },
        "zh-CN": { label: "简体中文", description: "Always use Simplified Chinese" },
        en: { label: "English", description: "Always use English" }
      }
    },
    sidebar: {
      brand: "OneMoreMark"
    },
    content: {
      importSuccess: "Import successful",
      noSearchResult: "No matching websites found",
      closeSyncWarning: "Close sync storage warning"
    },
    popup: {
      saved: "Saved. Click to remove from this category.",
      unsaved: "Not saved. Click to save.",
      saveAllTabs: "Save all tabs and close",
      addCategoryPlaceholder: "Add category"
    },
    bookmarkEdit: {
      title: "Edit Website",
      description: "Update the name, website URL, and custom icon link.",
      name: "Website name",
      url: "Website URL",
      icon: "Icon URL",
      iconPlaceholder: "Optional, http/https image URL only",
      iconHelp: "Optional. Only custom icon links are saved, up to {max} characters."
    },
    deleteCategory: {
      title: "Delete Category",
      description: "If you delete “{name}”, the {count} bookmarks in this category will also be removed. This action cannot be undone. Continue?",
      confirm: "Delete"
    }
  }
} as const;

type MessageShape = (typeof messages)["zh-CN"] | (typeof messages)["en"];

type I18nValue = {
  localeMode: LocaleMode;
  locale: ResolvedLocale;
  messages: MessageShape;
};

const I18nContext = createContext<I18nValue>({
  localeMode: "system",
  locale: "zh-CN",
  messages: messages["zh-CN"]
});

export function I18nProvider({
  localeMode,
  children
}: {
  localeMode: LocaleMode;
  children: ReactNode;
}) {
  const locale = resolveLocaleMode(localeMode);
  const value = useMemo(
    () => ({
      localeMode,
      locale,
      messages: messages[locale]
    }),
    [locale, localeMode]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function getThemeOptionText(locale: ResolvedLocale, themeMode: ThemeMode) {
  return messages[locale].theme.options[themeMode];
}
