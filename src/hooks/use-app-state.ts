import { useEffect, useMemo, useRef, useState } from "react";

import {
  mergeImportedBookmarks,
  parseBookmarksFromHtml
} from "../services/bookmark-html";
import { createMockState, mockState } from "../data/mock";
import { normalizeStoredIcon } from "../lib/favicon";
import { getTemporaryCategoryName, resolveLocaleMode } from "../lib/locale";
import {
  getSyncSnapshot,
  loadState,
  loadStateSync,
  saveState,
  subscribeStateChanges,
  subscribeSyncStatus,
  syncStateWithCloud,
  type ManualSyncResult,
  type SyncSnapshot,
  type SyncStatus
} from "../services/storage";
import type { AppState, Bookmark, Category, LocaleMode, ThemeMode } from "../types/models";

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadStateSync());
  const [search, setSearch] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const persistedStateRef = useRef(JSON.stringify(state));

  useEffect(() => {
    loadState()
      .then((nextState) => {
        persistedStateRef.current = JSON.stringify(nextState);
        setState(nextState);
        setStorageReady(true);
      })
      .catch(() => {
        const fallbackState = createMockState(resolveLocaleMode(state.localeMode), state.localeMode);
        persistedStateRef.current = JSON.stringify(fallbackState);
        setState(fallbackState);
        setStorageReady(true);
      });
  }, []);

  useEffect(() => {
    return subscribeStateChanges((nextState) => {
      persistedStateRef.current = JSON.stringify(nextState);
      setState(nextState);
    });
  }, []);

  useEffect(() => {
    if (!state || !storageReady) {
      return;
    }

    const nextStateJson = JSON.stringify(state);
    if (nextStateJson === persistedStateRef.current) {
      return;
    }

    persistedStateRef.current = nextStateJson;
    void saveState(state);
  }, [state, storageReady]);

  useEffect(() => {
    return subscribeSyncStatus(setSyncStatus);
  }, []);

  const filteredCategories = useMemo(() => {
    return [...state.categories].sort((a, b) => a.order - b.order);
  }, [state]);

  const groupedBookmarks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const groups = filteredCategories
      .filter((category) => category.name.trim().length > 0)
      .map((category) => {
      const items = state.bookmarks
        .filter((bookmark) => bookmark.categoryId === category.id)
        .filter((bookmark) => {
          if (!keyword) {
            return true;
          }

          return (
            bookmark.title.toLowerCase().includes(keyword) ||
            bookmark.url.toLowerCase().includes(keyword)
          );
        })
        .sort((a, b) => a.order - b.order);

        return { category, items };
      });

    if (!keyword) {
      return groups;
    }

    return groups.filter((group) => group.items.length > 0);
  }, [filteredCategories, search, state]);

  function toggleSidebar() {
    setState((current) => ({ ...current, sidebarCollapsed: !current.sidebarCollapsed }));
  }

  function setThemeMode(themeMode: ThemeMode) {
    setState((current) => ({ ...current, themeMode }));
  }

  function setLocaleMode(localeMode: LocaleMode) {
    setState((current) => ({ ...current, localeMode }));
  }

  function addCategory(name: string, id = crypto.randomUUID(), allowEmpty = false) {
    const value = name.trim();
    if (!value && !allowEmpty) {
      return null;
    }

    setState((current) => {
      const next: Category = {
        id,
        name: value,
        order: current.categories.length
      };

      return { ...current, categories: [...current.categories, next] };
    });

    return id;
  }

  function updateCategory(categoryId: string, name: string) {
    const value = name.trim();
    if (!value) {
      return;
    }

    setState((current) => {
      return {
        ...current,
        categories: current.categories.map((item) =>
          item.id === categoryId ? { ...item, name: value } : item
        )
      };
    });
  }

  function setCategoryOrder(categoryIds: string[]) {
    setState((current) => {
      const categoryMap = new Map(current.categories.map((item) => [item.id, item]));
      const orderedCategories = categoryIds
        .map((id) => categoryMap.get(id))
        .filter((item): item is Category => Boolean(item));

      if (orderedCategories.length !== current.categories.length) {
        return current;
      }

      return {
        ...current,
        categories: orderedCategories.map((item, index) => ({
          ...item,
          order: index
        }))
      };
    });
  }

  function removeCategory(categoryId: string) {
    setState((current) => {
      const nextCategories = current.categories
        .filter((item) => item.id !== categoryId)
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({
          ...item,
          order: index
        }));

      return {
        ...current,
        categories: nextCategories,
        bookmarks: current.bookmarks.filter((item) => item.categoryId !== categoryId)
      };
    });
  }

  function setBookmarkLayout(
    layout: Array<{
      id: string;
      categoryId: string;
      order: number;
    }>
  ) {
    setState((current) => {
      const layoutMap = new Map(
        layout.map((item) => [item.id, { categoryId: item.categoryId, order: item.order }])
      );

      return {
        ...current,
        bookmarks: current.bookmarks.map((item) => {
          const next = layoutMap.get(item.id);
          return next
            ? {
                ...item,
                categoryId: next.categoryId,
                order: next.order
              }
            : item;
        })
      };
    });
  }

  function moveBookmarkToCategoryEnd(bookmarkId: string, categoryId: string) {
    setState((current) => {
      const bookmark = current.bookmarks.find((item) => item.id === bookmarkId);
      if (!bookmark || bookmark.categoryId === categoryId) {
        return current;
      }

      const nextTargetOrder = current.bookmarks.filter((item) => item.categoryId === categoryId)
        .length;

      return {
        ...current,
        bookmarks: current.bookmarks.map((item) => {
          if (item.id === bookmarkId) {
            return {
              ...item,
              categoryId,
              order: nextTargetOrder
            };
          }

          if (item.categoryId === bookmark.categoryId && item.order > bookmark.order) {
            return {
              ...item,
              order: item.order - 1
            };
          }

          return item;
        })
      };
    });
  }

  function removeBookmarkAndReorder(
    bookmarks: Bookmark[],
    matcher: (bookmark: Bookmark) => boolean
  ) {
    const targetBookmark = bookmarks.find(matcher);
    if (!targetBookmark) {
      return {
        removed: false,
        bookmarks
      };
    }

    return {
      removed: true,
      bookmarks: bookmarks
        .filter((item) => item.id !== targetBookmark.id)
        .map((item) =>
          item.categoryId === targetBookmark.categoryId && item.order > targetBookmark.order
            ? { ...item, order: item.order - 1 }
            : item
        )
    };
  }

  function saveBookmarkToCategory(input: {
    title: string;
    url: string;
    icon: string;
    categoryId: string;
  }) {
    const trimmedUrl = input.url.trim();
    const trimmedTitle = input.title.trim() || trimmedUrl;
    const customIcon = normalizeStoredIcon(trimmedUrl, input.icon);

    if (!trimmedUrl) {
      return "invalid";
    }

    let result: "created" | "moved" | "unchanged" | "invalid" = "invalid";

    setState((current) => {
      const targetCategory = current.categories.find((item) => item.id === input.categoryId);
      if (!targetCategory) {
        result = "invalid";
        return current;
      }

      const existingBookmark = current.bookmarks.find((item) => item.url === trimmedUrl);

      if (!existingBookmark) {
        result = "created";
        return {
          ...current,
          bookmarks: [
            ...current.bookmarks,
            {
              id: crypto.randomUUID(),
              title: trimmedTitle,
              url: trimmedUrl,
              icon: customIcon,
              categoryId: input.categoryId,
              order: current.bookmarks.filter((item) => item.categoryId === input.categoryId).length
            }
          ]
        };
      }

      if (existingBookmark.categoryId === input.categoryId) {
        result = "unchanged";
        return {
          ...current,
          bookmarks: current.bookmarks.map((item) =>
            item.id === existingBookmark.id
              ? {
                  ...item,
                  title: trimmedTitle,
                  icon: customIcon
                }
              : item
          )
        };
      }

      const nextTargetOrder = current.bookmarks.filter((item) => item.categoryId === input.categoryId)
        .length;

      result = "moved";
      return {
        ...current,
        bookmarks: current.bookmarks.map((item) => {
          if (item.id === existingBookmark.id) {
            return {
              ...item,
              title: trimmedTitle,
              url: trimmedUrl,
              icon: customIcon,
              categoryId: input.categoryId,
              order: nextTargetOrder
            };
          }

          if (item.categoryId === existingBookmark.categoryId && item.order > existingBookmark.order) {
            return {
              ...item,
              order: item.order - 1
            };
          }

          return item;
        })
      };
    });

    return result;
  }

  function saveTabsToTemporaryCategory(
    tabs: Array<{
      title: string;
      url: string;
      icon: string;
    }>
  ) {
    const normalizedTabs = tabs
      .map((tab) => ({
        title: tab.title.trim() || tab.url.trim(),
        url: tab.url.trim(),
        icon: ""
      }))
      .filter((tab) => tab.url);

    if (normalizedTabs.length === 0) {
      return null;
    }

    let targetCategoryId: string | null = null;

    setState((current) => {
      const temporaryCategoryName = getTemporaryCategoryName(resolveLocaleMode(current.localeMode));
      const existingTemporaryCategory = current.categories.find(
        (category) => category.name === temporaryCategoryName
      );

      const nextCategories = existingTemporaryCategory
        ? current.categories
        : [
            ...current.categories,
            {
              id: crypto.randomUUID(),
              name: temporaryCategoryName,
              order: current.categories.length
            }
          ];

      targetCategoryId =
        existingTemporaryCategory?.id ?? nextCategories[nextCategories.length - 1]?.id ?? null;

      if (!targetCategoryId) {
        return current;
      }

      const resolvedTargetCategoryId = targetCategoryId;

      let nextOrder = current.bookmarks.filter(
        (bookmark) => bookmark.categoryId === resolvedTargetCategoryId
      ).length;

      const handledUrls = new Set<string>();
      const nextBookmarks = [...current.bookmarks];

      normalizedTabs.forEach((tab) => {
        if (handledUrls.has(tab.url)) {
          return;
        }
        handledUrls.add(tab.url);

        const existingBookmarkIndex = nextBookmarks.findIndex((bookmark) => bookmark.url === tab.url);

        if (existingBookmarkIndex < 0) {
          nextBookmarks.push({
            id: crypto.randomUUID(),
            title: tab.title,
            url: tab.url,
            icon: "",
            categoryId: resolvedTargetCategoryId,
            order: nextOrder
          });
          nextOrder += 1;
          return;
        }

        const existingBookmark = nextBookmarks[existingBookmarkIndex];

        if (existingBookmark.categoryId === resolvedTargetCategoryId) {
          nextBookmarks[existingBookmarkIndex] = {
            ...existingBookmark,
            title: tab.title,
            icon: ""
          };
          return;
        }

        nextBookmarks[existingBookmarkIndex] = {
          ...existingBookmark,
          title: tab.title,
          icon: "",
          categoryId: resolvedTargetCategoryId,
          order: nextOrder
        };
        nextOrder += 1;

        for (let index = 0; index < nextBookmarks.length; index += 1) {
          const bookmark = nextBookmarks[index];
          if (
            bookmark.id !== existingBookmark.id &&
            bookmark.categoryId === existingBookmark.categoryId &&
            bookmark.order > existingBookmark.order
          ) {
            nextBookmarks[index] = {
              ...bookmark,
              order: bookmark.order - 1
            };
          }
        }
      });

      return {
        ...current,
        categories: nextCategories,
        bookmarks: nextBookmarks
      };
    });

    return targetCategoryId;
  }

  function removeBookmarkByUrl(url: string) {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return false;
    }

    let removed = false;

    setState((current) => {
      const result = removeBookmarkAndReorder(
        current.bookmarks,
        (item) => item.url === trimmedUrl
      );
      if (!result.removed) {
        return current;
      }

      removed = true;
      return {
        ...current,
        bookmarks: result.bookmarks
      };
    });

    return removed;
  }

  function updateBookmark(nextBookmark: Bookmark) {
    setState((current) => {
      const normalizedBookmark = {
        ...nextBookmark,
        icon: normalizeStoredIcon(nextBookmark.url, nextBookmark.icon)
      };

      return {
        ...current,
        bookmarks: current.bookmarks.map((item) =>
          item.id === normalizedBookmark.id ? normalizedBookmark : item
        )
      };
    });
  }

  function removeBookmark(bookmarkId: string) {
    setState((current) => {
      const result = removeBookmarkAndReorder(
        current.bookmarks,
        (item) => item.id === bookmarkId
      );
      if (!result.removed) {
        return current;
      }

      return {
        ...current,
        bookmarks: result.bookmarks
      };
    });
  }

  function replaceState(nextState: AppState) {
    setState(nextState);
  }

  function importBookmarksHtml(html: string) {
    setState((current) => {
      const locale = resolveLocaleMode(current.localeMode);
      const imported = parseBookmarksFromHtml(html, locale);
      return mergeImportedBookmarks(current, imported, locale);
    });
  }

  async function syncWithCloud(): Promise<ManualSyncResult> {
    const currentStateJson = JSON.stringify(state);
    if (currentStateJson !== persistedStateRef.current) {
      persistedStateRef.current = currentStateJson;
      await saveState(state);
    }

    const syncResult = await syncStateWithCloud();
    persistedStateRef.current = JSON.stringify(syncResult.state);
    setState(syncResult.state);
    return syncResult.result;
  }

  async function getSyncOverview(): Promise<SyncSnapshot> {
    return getSyncSnapshot();
  }

  return {
    state,
    syncStatus,
    search,
    setSearch,
    filteredCategories,
    groupedBookmarks,
    toggleSidebar,
    setThemeMode,
    setLocaleMode,
    addCategory,
    updateCategory,
    removeCategory,
    setCategoryOrder,
    setBookmarkLayout,
    moveBookmarkToCategoryEnd,
    saveBookmarkToCategory,
    saveTabsToTemporaryCategory,
    removeBookmarkByUrl,
    updateBookmark,
    removeBookmark,
    replaceState,
    importBookmarksHtml,
    syncWithCloud,
    getSyncOverview
  };
}
