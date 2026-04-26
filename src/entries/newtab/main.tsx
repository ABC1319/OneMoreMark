import ReactDOM from "react-dom/client";

import "../../index.css";
import { useEffect, useRef, useState } from "react";
import { BookmarkEditDialog } from "../../components/newtab/bookmark-edit-dialog";
import { ContentPanel } from "../../components/newtab/content-panel";
import { DeleteCategoryDialog } from "../../components/newtab/delete-category-dialog";
import { Sidebar } from "../../components/newtab/sidebar";
import { useAppState } from "../../hooks/use-app-state";
import { I18nProvider } from "../../lib/i18n";
import { syncDocumentTheme } from "../../lib/theme";
import type { Bookmark } from "../../types/models";

requestAnimationFrame(() => {
  document.documentElement.classList.add("app-ready");
});

function NewTabApp() {
  const {
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
    updateBookmark,
    removeBookmark,
    importBookmarksHtml,
    syncWithCloud,
    getSyncOverview
  } = useAppState();
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [pendingNewCategoryId, setPendingNewCategoryId] = useState<string | null>(null);
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<string | null>(null);
  const [draggingBookmarkId, setDraggingBookmarkId] = useState<string | null>(null);
  const [bookmarkDragPointer, setBookmarkDragPointer] = useState<{ x: number; y: number } | null>(
    null
  );
  const [bookmarkDragInsideSidebar, setBookmarkDragInsideSidebar] = useState(false);
  const [sidebarBoundaryRight, setSidebarBoundaryRight] = useState<number | null>(null);
  const [sidebarDropCategoryId, setSidebarDropCategoryId] = useState<string | null>(null);
  const sidebarShellRef = useRef<HTMLDivElement | null>(null);

  if (!state) {
    return null;
  }

  const currentState = state;

  const pendingDeleteCategory =
    currentState.categories.find((category) => category.id === pendingDeleteCategoryId) ?? null;
  const pendingDeleteBookmarkCount = pendingDeleteCategoryId
    ? currentState.bookmarks.filter((bookmark) => bookmark.categoryId === pendingDeleteCategoryId)
        .length
    : 0;

  function handleRequestRemoveCategory(categoryId: string) {
    const category = currentState.categories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    const hasBookmarks = currentState.bookmarks.some(
      (bookmark) => bookmark.categoryId === categoryId
    );
    if (!hasBookmarks) {
      removeCategory(categoryId);
      return;
    }

    setPendingDeleteCategoryId(categoryId);
  }

  function handleConfirmRemoveCategory() {
    if (!pendingDeleteCategoryId) {
      return;
    }

    removeCategory(pendingDeleteCategoryId);
    setPendingDeleteCategoryId(null);
  }

  function handleCancelRemoveCategory() {
    setPendingDeleteCategoryId(null);
  }

  useEffect(() => {
    function updateSidebarBoundary() {
      setSidebarBoundaryRight(sidebarShellRef.current?.getBoundingClientRect().right ?? null);
    }

    updateSidebarBoundary();
    window.addEventListener("resize", updateSidebarBoundary);
    return () => {
      window.removeEventListener("resize", updateSidebarBoundary);
    };
  }, [currentState.sidebarCollapsed]);

  useEffect(() => {
    if (!draggingBookmarkId) {
      setBookmarkDragPointer(null);
      setBookmarkDragInsideSidebar(false);
      setSidebarDropCategoryId(null);
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const sidebarRect = sidebarShellRef.current?.getBoundingClientRect();
      setSidebarBoundaryRight(sidebarRect?.right ?? null);
      setBookmarkDragPointer({
        x: event.clientX,
        y: event.clientY
      });
      setBookmarkDragInsideSidebar(
        !!sidebarRect &&
          event.clientX >= sidebarRect.left &&
          event.clientX <= sidebarRect.right
      );
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [draggingBookmarkId]);

  useEffect(() => {
    return syncDocumentTheme(currentState.themeMode);
  }, [currentState.themeMode]);

  return (
    <>
      <div className="flex min-h-screen gap-4 p-4">
        <I18nProvider localeMode={currentState.localeMode}>
          <div className="flex min-w-0 flex-1 gap-4">
            <div
              ref={sidebarShellRef}
              className={`shrink-0 overflow-hidden transition-[width,opacity] duration-200 ${
                state.sidebarCollapsed ? "w-0 opacity-0" : "w-[260px] opacity-100"
              }`}
            >
              <div className="h-full">
                <Sidebar
                  categories={filteredCategories}
                  onAddCategory={() => {
                    const categoryId = addCategory("", crypto.randomUUID(), true);
                    if (categoryId) {
                      setEditingCategoryId(categoryId);
                      setPendingNewCategoryId(categoryId);
                    }
                  }}
                  onSelectCategory={setActiveCategoryId}
                  editingCategoryId={editingCategoryId}
                  pendingNewCategoryId={pendingNewCategoryId}
                  onEditingCategoryChange={setEditingCategoryId}
                  onPendingNewCategoryChange={setPendingNewCategoryId}
                  onRenameCategory={updateCategory}
                  onRequestRemoveCategory={handleRequestRemoveCategory}
                  onCommitCategoryOrder={setCategoryOrder}
                  bookmarkDragActive={Boolean(draggingBookmarkId)}
                  bookmarkDragPointer={bookmarkDragPointer}
                  bookmarkDragInsideSidebar={bookmarkDragInsideSidebar}
                  bookmarkDropCategoryId={sidebarDropCategoryId}
                  onBookmarkDropCategoryChange={setSidebarDropCategoryId}
                />
              </div>
            </div>

            <ContentPanel
              state={currentState}
              groups={groupedBookmarks}
              search={search}
              onSearchChange={setSearch}
              onToggleSidebar={toggleSidebar}
              sidebarCollapsed={currentState.sidebarCollapsed}
              themeMode={currentState.themeMode}
              localeMode={currentState.localeMode}
              onThemeModeChange={setThemeMode}
              onLocaleModeChange={setLocaleMode}
              onEditBookmark={setEditingBookmark}
              onRemoveBookmark={removeBookmark}
              onImportBookmarksHtml={importBookmarksHtml}
              activeCategoryId={activeCategoryId}
              onCommitBookmarkLayout={setBookmarkLayout}
              bookmarkDragPointer={bookmarkDragPointer}
              sidebarBoundaryRight={sidebarBoundaryRight}
              sidebarDropCategoryId={sidebarDropCategoryId}
              onBookmarkDragStateChange={(bookmarkId) => {
                setDraggingBookmarkId(bookmarkId);
                if (!bookmarkId) {
                  setBookmarkDragPointer(null);
                  setBookmarkDragInsideSidebar(false);
                  setSidebarDropCategoryId(null);
                }
              }}
              onMoveBookmarkToCategoryEnd={moveBookmarkToCategoryEnd}
              syncStatus={syncStatus}
              onSyncCloud={syncWithCloud}
              onGetSyncOverview={getSyncOverview}
            />
          </div>

          <BookmarkEditDialog
            bookmark={editingBookmark}
            onClose={() => setEditingBookmark(null)}
            onSave={(bookmark) => {
              updateBookmark(bookmark);
              setEditingBookmark(null);
            }}
          />
        </I18nProvider>
      </div>

      <DeleteCategoryDialog
        category={pendingDeleteCategory}
        bookmarkCount={pendingDeleteBookmarkCount}
        onCancel={handleCancelRemoveCategory}
        onConfirm={handleConfirmRemoveCategory}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<NewTabApp />);
