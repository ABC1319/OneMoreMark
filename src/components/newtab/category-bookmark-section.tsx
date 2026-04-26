import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown } from "lucide-react";
import type { MutableRefObject, ReactNode, RefCallback } from "react";

import type { Bookmark, Category } from "../../types/models";
import { BookmarkCard } from "./bookmark-card";

export type BookmarkGroup = {
  category: Category;
  items: Bookmark[];
};

type CategoryBookmarkSectionProps = {
  group: BookmarkGroup;
  activeBookmarkId: string | null;
  freezePreview: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onEditBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  sectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  lockedHeight?: number;
};

export function CategoryBookmarkSection({
  group,
  activeBookmarkId,
  freezePreview,
  collapsed,
  onToggleCollapsed,
  onEditBookmark,
  onRemoveBookmark,
  sectionRefs,
  lockedHeight
}: CategoryBookmarkSectionProps) {
  const setSectionRef: RefCallback<HTMLElement> = (node) => {
    sectionRefs.current[group.category.id] = node;
  };

  return (
    <section
      ref={setSectionRef}
      className="space-y-3"
      style={lockedHeight ? { minHeight: lockedHeight } : undefined}
    >
      <div className="flex items-center justify-between border-b pb-2">
        <div className="text-base font-semibold">{group.category.name}</div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-transparent text-foreground shadow-none transition-colors hover:border-border hover:bg-transparent hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:hover:border-white/12 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
          onClick={onToggleCollapsed}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
        </button>
      </div>
      {collapsed ? null : (
        <SortableContext
          items={group.items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <CategoryDropZone categoryId={group.category.id} empty={group.items.length === 0}>
            {group.items.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {group.items.map((bookmark) => (
                  <SortableBookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    dragging={activeBookmarkId === bookmark.id}
                    freezePreview={freezePreview}
                    onEdit={() => onEditBookmark(bookmark)}
                    onDelete={() => onRemoveBookmark(bookmark.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyCategoryDropZone categoryId={group.category.id} />
            )}
          </CategoryDropZone>
        </SortableContext>
      )}
    </section>
  );
}

function EmptyCategoryDropZone({ categoryId }: { categoryId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-group:${categoryId}`,
    data: {
      type: "empty-group",
      categoryId
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-[60px] items-center rounded-xl border border-dashed px-4 text-sm text-muted-foreground transition-colors ${
        isOver
          ? "border-border text-foreground dark:border-white/18"
          : "border-border/70 dark:border-white/10"
      }`}
    >
      将卡片拖到这里
    </div>
  );
}

function CategoryDropZone({
  categoryId,
  empty = false,
  children
}: {
  categoryId: string;
  empty?: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group:${categoryId}`,
    data: {
      type: "group",
      categoryId
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-2xl transition-shadow ${
        isOver ? "shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : ""
      } ${empty ? "min-h-[60px]" : ""}`}
    >
      {isOver ? (
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-dashed border-black/25 dark:border-white/18" />
      ) : null}
      {children}
    </div>
  );
}

function SortableBookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  dragging,
  freezePreview
}: {
  bookmark: Bookmark;
  onEdit: () => void;
  onDelete: () => void;
  dragging: boolean;
  freezePreview: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: bookmark.id,
      data: {
        type: "card",
        categoryId: bookmark.categoryId
      }
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: freezePreview ? undefined : CSS.Transform.toString(transform),
        transition: freezePreview ? undefined : transition
      }}
      {...attributes}
      {...listeners}
    >
      <BookmarkCard
        bookmark={bookmark}
        dragging={dragging || isDragging}
        placeholder={isDragging}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpen={() => window.open(bookmark.url, "_blank", "noopener,noreferrer")}
      />
    </div>
  );
}
