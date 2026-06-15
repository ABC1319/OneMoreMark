import {
  DndContext,
  DragOverlay
} from "@dnd-kit/core";
import { X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent
} from "react";

import { Card } from "../ui/card";
import { useBookmarkDrag } from "../../hooks/use-bookmark-drag";
import { exportBookmarksToHtml } from "../../services/bookmark-html";
import {
  FEATURED_LINK_REFRESH_INTERVAL_MS,
  fetchFeaturedLinkConfig,
  loadCachedFeaturedLinkConfig,
  loadClickedFeaturedLinkVersion,
  markFeaturedLinkClicked
} from "../../services/remote-config";
import type { ManualSyncResult, SyncSnapshot, SyncStatus } from "../../services/storage";
import type {
  AppState,
  Bookmark,
  FeaturedLinkConfig,
  LocaleMode,
  ThemeMode
} from "../../types/models";
import { BookmarkCard } from "./bookmark-card";
import { CategoryBookmarkSection, type BookmarkGroup } from "./category-bookmark-section";
import { ContentToolbar } from "./content-toolbar";
import { LanguageDialog } from "./language-dialog";
import { SyncStatusDialog } from "./sync-status-dialog";
import { ThemeDialog } from "./theme-dialog";
import { useI18n } from "../../lib/i18n";
import { resolveLocaleMode } from "../../lib/locale";

type ContentPanelProps = {
  state: AppState;
  groups: BookmarkGroup[];
  search: string;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  themeMode: ThemeMode;
  localeMode: LocaleMode;
  onThemeModeChange: (themeMode: ThemeMode) => void;
  onLocaleModeChange: (localeMode: LocaleMode) => void;
  onEditBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onImportBookmarksHtml: (html: string) => void;
  activeCategoryId: string | null;
  onCommitBookmarkLayout: (
    layout: Array<{ id: string; categoryId: string; order: number }>
  ) => void;
  bookmarkDragPointer: { x: number; y: number } | null;
  sidebarBoundaryRight: number | null;
  sidebarDropCategoryId: string | null;
  onBookmarkDragStateChange: (bookmarkId: string | null) => void;
  onMoveBookmarkToCategoryEnd: (bookmarkId: string, categoryId: string) => void;
  syncStatus: SyncStatus | null;
  onSyncCloud: () => Promise<ManualSyncResult>;
  onGetSyncOverview: () => Promise<SyncSnapshot>;
};

function resolveFeaturedLinkLocale(config: FeaturedLinkConfig, locale: "zh-CN" | "en") {
  const localized = config.locales[locale];
  const zhCN = config.locales["zh-CN"];
  const en = config.locales.en;

  if (
    locale === "en" &&
    localized.text === zhCN.text &&
    localized.url === zhCN.url &&
    zhCN.text === "更多精彩"
  ) {
    return {
      text: "More",
      url: "https://onemoremark.pages.dev/en/"
    };
  }

  if (
    locale === "zh-CN" &&
    localized.text === en.text &&
    localized.url === en.url &&
    en.text === "More"
  ) {
    return {
      text: "更多精彩",
      url: "https://onemoremark.pages.dev/zh/"
    };
  }

  return localized;
}

export function ContentPanel({
  state,
  groups,
  search,
  onSearchChange,
  onToggleSidebar,
  sidebarCollapsed,
  themeMode,
  localeMode,
  onThemeModeChange,
  onLocaleModeChange,
  onEditBookmark,
  onRemoveBookmark,
  onImportBookmarksHtml,
  activeCategoryId,
  onCommitBookmarkLayout,
  bookmarkDragPointer,
  sidebarBoundaryRight,
  sidebarDropCategoryId,
  onBookmarkDragStateChange,
  onMoveBookmarkToCategoryEnd,
  syncStatus,
  onSyncCloud,
  onGetSyncOverview
}: ContentPanelProps) {
  const { messages } = useI18n();
  const resolvedLocale = resolveLocaleMode(localeMode);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<string[]>([]);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [showSyncQuotaWarning, setShowSyncQuotaWarning] = useState(false);
  const [manualSyncToast, setManualSyncToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSnapshot, setSyncSnapshot] = useState<SyncSnapshot | null>(null);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [featuredLink, setFeaturedLink] = useState<FeaturedLinkConfig | null>(null);
  const [clickedFeaturedLinkVersion, setClickedFeaturedLinkVersion] = useState<string | null>(null);
  const successToastTimerRef = useRef<number | null>(null);
  const syncWarningTimerRef = useRef<number | null>(null);
  const manualSyncToastTimerRef = useRef<number | null>(null);
  const {
    activeBookmarkId,
    collisionDetection,
    draggedBookmark,
    handleDragCancel,
    handleDragEnd,
    handleDragMove,
    handleDragOver,
    handleDragStart,
    lockedSectionHeights,
    renderedGroups,
    scrollContainerRef,
    sectionRefs,
    sensors,
    shouldFreezePreview
  } = useBookmarkDrag({
    groups,
    activeCategoryId,
    bookmarkDragPointer,
    sidebarBoundaryRight,
    sidebarDropCategoryId,
    onCommitBookmarkLayout,
    onBookmarkDragStateChange,
    onMoveBookmarkToCategoryEnd
  });

  useEffect(() => {
    return () => {
      if (successToastTimerRef.current) {
        window.clearTimeout(successToastTimerRef.current);
      }

      if (syncWarningTimerRef.current) {
        window.clearTimeout(syncWarningTimerRef.current);
      }

      if (manualSyncToastTimerRef.current) {
        window.clearTimeout(manualSyncToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadFeaturedLink() {
      const [cachedConfig, clickedVersion] = await Promise.all([
        loadCachedFeaturedLinkConfig(),
        loadClickedFeaturedLinkVersion()
      ]);

      if (!active) {
        return;
      }

      setFeaturedLink(cachedConfig);
      setClickedFeaturedLinkVersion(clickedVersion);

      try {
        const remoteConfig = await fetchFeaturedLinkConfig();
        if (active) {
          setFeaturedLink(remoteConfig);
        }
      } catch {
        // Keep the cached config when Cloudflare is temporarily unavailable.
      }
    }

    void loadFeaturedLink();
    const refreshTimer = window.setInterval(() => {
      fetchFeaturedLinkConfig()
        .then((remoteConfig) => {
          if (active) {
            setFeaturedLink(remoteConfig);
          }
        })
        .catch(() => undefined);
    }, FEATURED_LINK_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (syncStatus?.type !== "quota-exceeded") {
      return;
    }

    setShowSyncQuotaWarning(true);
    if (syncWarningTimerRef.current) {
      window.clearTimeout(syncWarningTimerRef.current);
    }
    syncWarningTimerRef.current = window.setTimeout(() => {
      setShowSyncQuotaWarning(false);
      syncWarningTimerRef.current = null;
    }, 2000);
  }, [syncStatus]);

  useEffect(() => {
    setCollapsedCategoryIds((current) =>
      current.filter((categoryId) => groups.some((group) => group.category.id === categoryId))
    );
  }, [groups]);


  function toggleCategoryCollapsed(categoryId: string) {
    setCollapsedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId]
    );
  }

  function collapseAllCategories() {
    setCollapsedCategoryIds(groups.map((group) => group.category.id));
  }

  function expandAllCategories() {
    setCollapsedCategoryIds([]);
  }

  function handleExport() {
    const html = exportBookmarksToHtml(state);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "onemoremark-bookmarks.html";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const html = await file.text();
      onImportBookmarksHtml(html);
      setShowImportSuccess(true);
      if (successToastTimerRef.current) {
        window.clearTimeout(successToastTimerRef.current);
      }
      successToastTimerRef.current = window.setTimeout(() => {
        setShowImportSuccess(false);
      }, 2200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      window.alert(message);
    }
    event.target.value = "";
  }

  function showManualSyncToast(message: string) {
    setManualSyncToast(message);
    if (manualSyncToastTimerRef.current) {
      window.clearTimeout(manualSyncToastTimerRef.current);
    }
    manualSyncToastTimerRef.current = window.setTimeout(() => {
      setManualSyncToast(null);
      manualSyncToastTimerRef.current = null;
    }, 2200);
  }

  async function handleSyncCloud(): Promise<ManualSyncResult> {
    setSyncing(true);
    try {
      const result = await onSyncCloud();
      const messageMap: Record<ManualSyncResult, string> = {
        uploaded: messages.sync.toastUploaded,
        downloaded: messages.sync.toastDownloaded,
        "already-synced": messages.sync.toastLatest,
        "quota-exceeded": messages.sync.toastQuota,
        unavailable: messages.sync.toastUnavailable,
        failed: messages.sync.toastFailed
      };

      showManualSyncToast(messageMap[result]);
      setSyncSnapshot(await onGetSyncOverview());
      return result;
    } finally {
      setSyncing(false);
    }
  }

  async function handleOpenSyncStatus() {
    setSyncDialogOpen(true);
    setSyncSnapshot(await onGetSyncOverview());
  }

  async function handleOpenFeaturedLink(config: FeaturedLinkConfig) {
    const localizedFeaturedLink = resolveFeaturedLinkLocale(config, resolvedLocale);
    setClickedFeaturedLinkVersion(config.version);
    await markFeaturedLinkClicked(config.version);
    window.open(localizedFeaturedLink.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex-1">
      {showSyncQuotaWarning ? (
        <div className="fixed left-1/2 top-5 z-[80] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]">
            <span>收藏较多，已保存在本机，Chrome 同步空间不足，可选择手动导出和导入</span>
            <button
              type="button"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              aria-label={messages.content.closeSyncWarning}
              onClick={() => {
                if (syncWarningTimerRef.current) {
                  window.clearTimeout(syncWarningTimerRef.current);
                  syncWarningTimerRef.current = null;
                }
                setShowSyncQuotaWarning(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {showImportSuccess ? (
        <div
          className={`pointer-events-none fixed left-1/2 z-[80] -translate-x-1/2 ${
            showSyncQuotaWarning || manualSyncToast ? "top-16" : "top-5"
          }`}
        >
          <div className="rounded-xl border border-border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]">
            {messages.content.importSuccess}
          </div>
        </div>
      ) : null}

      {manualSyncToast ? (
        <div
          className={`pointer-events-none fixed left-1/2 z-[80] -translate-x-1/2 ${
            showSyncQuotaWarning ? "top-16" : "top-5"
          }`}
        >
          <div className="rounded-xl border border-border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]">
            {manualSyncToast}
          </div>
        </div>
      ) : null}

      {syncing ? (
        <div
          className={`pointer-events-none fixed left-1/2 z-[80] -translate-x-1/2 ${
            showSyncQuotaWarning || manualSyncToast ? "top-16" : "top-5"
          }`}
        >
          <div className="rounded-xl border border-border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]">
            {messages.sync.syncing}
          </div>
        </div>
      ) : null}

      <Card className="flex h-[calc(100vh-32px)] flex-col overflow-hidden border-border shadow-[0_10px_24px_rgba(15,23,42,0.04)] ring-0 dark:border-white/10 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)] p-3">
        <ContentToolbar
          search={search}
          sidebarCollapsed={sidebarCollapsed}
          onSearchChange={onSearchChange}
          onToggleSidebar={onToggleSidebar}
          onCollapseAll={collapseAllCategories}
          onExpandAll={expandAllCategories}
          onExport={handleExport}
          onImport={() => fileInputRef.current?.click()}
          onOpenSyncStatus={handleOpenSyncStatus}
          onOpenTheme={() => setThemeDialogOpen(true)}
          onOpenLanguage={() => setLanguageDialogOpen(true)}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".html,text/html"
          className="hidden"
          onChange={handleImportFile}
        />

        <ThemeDialog
          open={themeDialogOpen}
          themeMode={themeMode}
          onOpenChange={setThemeDialogOpen}
          onThemeModeChange={onThemeModeChange}
        />

        <LanguageDialog
          open={languageDialogOpen}
          localeMode={localeMode}
          onOpenChange={setLanguageDialogOpen}
          onLocaleModeChange={onLocaleModeChange}
        />

        <SyncStatusDialog
          open={syncDialogOpen}
          syncing={syncing}
          snapshot={syncSnapshot}
          onOpenChange={setSyncDialogOpen}
          onSync={handleSyncCloud}
        />

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-2 pb-2 pt-1"
          style={shouldFreezePreview ? { overflowY: "hidden" } : undefined}
        >
          <DndContext
            autoScroll={false}
            collisionDetection={collisionDetection}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="space-y-6">
              {renderedGroups.map((group, index) => (
                <CategoryBookmarkSection
                  key={group.category.id}
                  group={group}
                  activeBookmarkId={activeBookmarkId}
                  freezePreview={shouldFreezePreview}
                  collapsed={collapsedCategoryIds.includes(group.category.id)}
                  onToggleCollapsed={() => toggleCategoryCollapsed(group.category.id)}
                  onEditBookmark={onEditBookmark}
                  onRemoveBookmark={onRemoveBookmark}
                  sectionRefs={sectionRefs}
                  lockedHeight={lockedSectionHeights[group.category.id]}
                  featuredLink={index === 0 ? featuredLink : null}
                  featuredLinkText={
                    index === 0 && featuredLink
                      ? resolveFeaturedLinkLocale(featuredLink, resolvedLocale).text
                      : ""
                  }
                  showFeaturedLinkDot={
                    index === 0 &&
                    Boolean(featuredLink?.showRedDot) &&
                    featuredLink?.version !== clickedFeaturedLinkVersion
                  }
                  onFeaturedLinkOpen={
                    index === 0 && featuredLink
                      ? () => void handleOpenFeaturedLink(featuredLink)
                      : undefined
                  }
                />
              ))}

              {!renderedGroups.some((group) => group.items.length > 0) && (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  {messages.content.noSearchResult}
                </Card>
              )}
            </div>

            <DragOverlay dropAnimation={null}>
              {draggedBookmark ? (
                <div className="w-[280px] scale-[1.04]">
                  <BookmarkCard
                    bookmark={draggedBookmark}
                    onEdit={() => undefined}
                    onDelete={() => undefined}
                    onOpen={() => undefined}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </Card>
    </div>
  );
}
