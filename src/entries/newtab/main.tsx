import ReactDOM from "react-dom/client";

import "../../index.css";
import { useState } from "react";
import { BookmarkEditDialog } from "../../components/newtab/bookmark-edit-dialog";
import { ContentPanel } from "../../components/newtab/content-panel";
import { Sidebar } from "../../components/newtab/sidebar";
import { useAppState } from "../../hooks/use-app-state";
import type { Bookmark } from "../../types/models";

function NewTabApp() {
  const {
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
  } = useAppState();
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [pendingNewCategoryId, setPendingNewCategoryId] = useState<string | null>(null);

  if (!state) {
    return null;
  }

  return (
    <div className="flex min-h-screen gap-4 p-4">
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="flex flex-col">
          <Sidebar
            categories={filteredCategories}
            collapsed={state.sidebarCollapsed}
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
            onRemoveCategory={removeCategory}
            onCommitCategoryOrder={setCategoryOrder}
          />
        </div>

        <ContentPanel
          groups={groupedBookmarks}
          search={search}
          onSearchChange={setSearch}
          onToggleSidebar={toggleSidebar}
          onEditBookmark={setEditingBookmark}
          activeCategoryId={activeCategoryId}
          onCommitBookmarkLayout={setBookmarkLayout}
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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<NewTabApp />);
