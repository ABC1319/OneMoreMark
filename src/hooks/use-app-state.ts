import { useEffect, useMemo, useState } from "react";

import { loadState, saveState } from "../services/storage";
import type { AppState, Bookmark, Category } from "../types/models";

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadState().then(setState);
  }, []);

  useEffect(() => {
    if (state) {
      void saveState(state);
    }
  }, [state]);

  const filteredCategories = useMemo(() => {
    if (!state) {
      return [];
    }

    return [...state.categories].sort((a, b) => a.order - b.order);
  }, [state]);

  const groupedBookmarks = useMemo(() => {
    if (!state) {
      return [];
    }

    const keyword = search.trim().toLowerCase();
    return filteredCategories.map((category) => {
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
  }, [filteredCategories, search, state]);

  function toggleSidebar() {
    setState((current) =>
      current
        ? { ...current, sidebarCollapsed: !current.sidebarCollapsed }
        : current
    );
  }

  function addCategory(name: string, id = crypto.randomUUID(), allowEmpty = false) {
    const value = name.trim();
    if (!value && !allowEmpty) {
      return null;
    }

    setState((current) => {
      if (!current) {
        return current;
      }

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
      if (!current) {
        return current;
      }

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
      if (!current) {
        return current;
      }

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
      if (!current) {
        return current;
      }

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
      if (!current) {
        return current;
      }

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

  function updateBookmark(nextBookmark: Bookmark) {
    setState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        bookmarks: current.bookmarks.map((item) =>
          item.id === nextBookmark.id ? nextBookmark : item
        )
      };
    });
  }

  return {
    state,
    search,
    setSearch,
    filteredCategories,
    groupedBookmarks,
    toggleSidebar,
    addCategory,
    updateCategory,
    removeCategory,
    setCategoryOrder,
    setBookmarkLayout,
    updateBookmark
  };
}
