import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import type { Category } from "../../types/models";
import { EditDeleteMenu } from "./edit-delete-menu";
import { PanelCardShell } from "./panel-card-shell";

type SidebarProps = {
  categories: Category[];
  onAddCategory: () => void;
  onSelectCategory: (categoryId: string) => void;
  editingCategoryId: string | null;
  pendingNewCategoryId: string | null;
  onEditingCategoryChange: (categoryId: string | null) => void;
  onPendingNewCategoryChange: (categoryId: string | null) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onRequestRemoveCategory: (categoryId: string) => void;
  onCommitCategoryOrder: (categoryIds: string[]) => void;
  bookmarkDragActive: boolean;
  bookmarkDragPointer: { x: number; y: number } | null;
  bookmarkDragInsideSidebar: boolean;
  bookmarkDropCategoryId: string | null;
  onBookmarkDropCategoryChange: (categoryId: string | null) => void;
};

export function Sidebar({
  categories,
  onAddCategory,
  onSelectCategory,
  editingCategoryId,
  pendingNewCategoryId,
  onEditingCategoryChange,
  onPendingNewCategoryChange,
  onRenameCategory,
  onRequestRemoveCategory,
  onCommitCategoryOrder,
  bookmarkDragActive,
  bookmarkDragPointer,
  bookmarkDragInsideSidebar,
  bookmarkDropCategoryId,
  onBookmarkDropCategoryChange
}: SidebarProps) {
  const [draftName, setDraftName] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [openMenuCategoryId, setOpenMenuCategoryId] = useState<string | null>(null);
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastScrollPointerRef = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );

  useEffect(() => {
    if (!editingCategoryId) {
      setDraftName("");
      return;
    }

    const currentCategory = categories.find((item) => item.id === editingCategoryId);
    setDraftName(currentCategory?.name ?? "");
  }, [categories, editingCategoryId]);

  useEffect(() => {
    setOrderedIds(categories.map((item) => item.id));
  }, [categories]);

  function commitRename(categoryId: string) {
    const value = draftName.trim();
    if (!value && pendingNewCategoryId === categoryId) {
      onRequestRemoveCategory(categoryId);
      onPendingNewCategoryChange(null);
      onEditingCategoryChange(null);
      return;
    }

    onRenameCategory(categoryId, draftName);
    if (pendingNewCategoryId === categoryId) {
      onPendingNewCategoryChange(null);
    }
    onEditingCategoryChange(null);
  }

  const orderedCategories = useMemo(() => {
    const categoryMap = new Map(categories.map((item) => [item.id, item]));
    const ids = orderedIds.length ? orderedIds : categories.map((item) => item.id);
    return ids
      .map((id) => categoryMap.get(id))
      .filter((item): item is Category => Boolean(item));
  }, [categories, orderedIds]);

  const draggedCategory =
    orderedCategories.find((item) => item.id === activeCategoryId) ?? null;

  useEffect(() => {
    if (!bookmarkDragActive || !bookmarkDragPointer) {
      lastScrollPointerRef.current = null;
      onBookmarkDropCategoryChange(null);
      return;
    }

    if (!bookmarkDragInsideSidebar) {
      lastScrollPointerRef.current = null;
      onBookmarkDropCategoryChange(null);
      return;
    }

    const pointerKey = `${bookmarkDragPointer.x}:${bookmarkDragPointer.y}`;
    const pointerChanged = lastScrollPointerRef.current !== pointerKey;
    lastScrollPointerRef.current = pointerKey;

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && pointerChanged) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const edgeOffset = 24;
      const scrollStep = 18;

      if (
        bookmarkDragPointer.x >= containerRect.left &&
        bookmarkDragPointer.x <= containerRect.right
      ) {
        if (bookmarkDragPointer.y <= containerRect.top + edgeOffset) {
          scrollContainer.scrollBy({ top: -scrollStep });
        } else if (bookmarkDragPointer.y >= containerRect.bottom - edgeOffset) {
          scrollContainer.scrollBy({ top: scrollStep });
        }
      }
    }

    const hoveredCategoryId =
      orderedCategories.find((category) => {
        const node = categoryRefs.current[category.id];
        if (!node) {
          return false;
        }

        const rect = node.getBoundingClientRect();
        return (
          bookmarkDragPointer.x >= rect.left &&
          bookmarkDragPointer.x <= rect.right &&
          bookmarkDragPointer.y >= rect.top &&
          bookmarkDragPointer.y <= rect.bottom
        );
      })?.id ?? null;

    onBookmarkDropCategoryChange(hoveredCategoryId);
  }, [
    bookmarkDragActive,
    bookmarkDragInsideSidebar,
    bookmarkDragPointer,
    onBookmarkDropCategoryChange,
    orderedCategories
  ]);

  function handleDragStart(event: DragStartEvent) {
    const categoryId = String(event.active.id);
    setActiveCategoryId(categoryId);
    setDragOverlayWidth(categoryRefs.current[categoryId]?.getBoundingClientRect().width ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCategoryId(null);
    setDragOverlayWidth(null);

    if (!over || active.id === over.id) {
      return;
    }

    setOrderedIds((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      const next = arrayMove(current, oldIndex, newIndex);
      onCommitCategoryOrder(next);
      return next;
    });
  }

  return (
    <Card className="flex h-[calc(100vh-32px)] flex-col border-border shadow-[0_10px_24px_rgba(15,23,42,0.04)] ring-0 dark:border-white/10 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)] p-3">
      <div className="mb-3 flex min-h-10 items-center justify-between px-2 py-1">
        <div>
          <div className="text-[18px] font-semibold tracking-[-0.01em]">TabCard</div>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-lg border-border/70 bg-transparent text-foreground shadow-none hover:border-border hover:bg-transparent hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:hover:border-white/12 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
          onClick={onAddCategory}
        >
          +
        </Button>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveCategoryId(null);
          setDragOverlayWidth(null);
        }}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div ref={scrollContainerRef} className="flex-1 space-y-2 overflow-y-auto">
            {orderedCategories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                bookmarkDragActive={bookmarkDragActive}
                editingCategoryId={editingCategoryId}
                draftName={draftName}
                isDragging={activeCategoryId === category.id}
                isMenuOpen={openMenuCategoryId === category.id}
                highlightAsDropTarget={
                  bookmarkDragInsideSidebar && bookmarkDropCategoryId === category.id
                }
                onDraftNameChange={setDraftName}
                onEditCategory={onEditingCategoryChange}
                onCommitRename={commitRename}
                onDeleteCategory={onRequestRemoveCategory}
                onMenuOpenChange={setOpenMenuCategoryId}
                onSelectCategory={onSelectCategory}
                onNodeChange={(node) => {
                  categoryRefs.current[category.id] = node;
                }}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {draggedCategory ? (
            <CategoryDragOverlay
              category={draggedCategory}
              width={dragOverlayWidth}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </Card>
  );
}

type SortableCategoryItemProps = {
  category: Category;
  bookmarkDragActive: boolean;
  editingCategoryId: string | null;
  draftName: string;
  isDragging: boolean;
  isMenuOpen: boolean;
  highlightAsDropTarget: boolean;
  onDraftNameChange: (value: string) => void;
  onEditCategory: (categoryId: string | null) => void;
  onCommitRename: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMenuOpenChange: (categoryId: string | null) => void;
  onSelectCategory: (categoryId: string) => void;
  onNodeChange: (node: HTMLDivElement | null) => void;
};

function SortableCategoryItem({
  category,
  bookmarkDragActive,
  editingCategoryId,
  draftName,
  isDragging,
  isMenuOpen,
  highlightAsDropTarget,
  onDraftNameChange,
  onEditCategory,
  onCommitRename,
  onDeleteCategory,
  onMenuOpenChange,
  onSelectCategory,
  onNodeChange
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging
  } = useSortable({
    id: category.id,
    disabled: editingCategoryId === category.id || bookmarkDragActive
  });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        onNodeChange(node);
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      {...attributes}
      {...listeners}
    >
      <PanelCardShell
        className="cursor-grab gap-2 py-3"
        placeholder={sortableDragging || isDragging}
        dragging={bookmarkDragActive}
        highlighted={highlightAsDropTarget}
        onClick={() => onSelectCategory(category.id)}
      >
        <CategoryCardContent
          category={category}
          editing={editingCategoryId === category.id}
          draftName={draftName}
          hidden={sortableDragging || isDragging}
          isMenuOpen={isMenuOpen}
          onDraftNameChange={onDraftNameChange}
          onCommitRename={onCommitRename}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onMenuOpenChange={onMenuOpenChange}
        />
      </PanelCardShell>
    </div>
  );
}

type CategoryCardContentProps = {
  category: Category;
  editing: boolean;
  draftName: string;
  hidden?: boolean;
  isMenuOpen?: boolean;
  onDraftNameChange?: (value: string) => void;
  onCommitRename?: (categoryId: string) => void;
  onEditCategory?: (categoryId: string | null) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onMenuOpenChange?: (categoryId: string | null) => void;
};

function CategoryCardContent({
  category,
  editing,
  draftName,
  hidden = false,
  isMenuOpen = false,
  onDraftNameChange = () => undefined,
  onCommitRename = () => undefined,
  onEditCategory = () => undefined,
  onDeleteCategory = () => undefined,
  onMenuOpenChange = () => undefined
}: CategoryCardContentProps) {
  return (
    <>
      <div
        className={`min-w-0 flex-1 overflow-hidden text-left ${
          hidden ? "opacity-0" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        {editing ? (
          <Input
            autoFocus
            className="h-9 w-full rounded-md border-border/60 bg-muted/30 px-2.5 shadow-none focus-visible:border-border/80 focus-visible:ring-0"
            value={draftName}
            onBlur={() => onCommitRename(category.id)}
            onChange={(event) => onDraftNameChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onCommitRename(category.id);
              }

              if (event.key === "Escape") {
                onEditCategory(null);
              }
            }}
          />
        ) : (
          <div className="flex h-9 items-center">
            <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
              {category.name}
            </span>
          </div>
        )}
      </div>
      <EditDeleteMenu
        hidden={hidden}
        open={isMenuOpen}
        onOpenChange={(open) => onMenuOpenChange(open ? category.id : null)}
        onTriggerClick={(event) => event.stopPropagation()}
        onTriggerPointerDown={(event) => event.stopPropagation()}
        onContentClick={(event) => event.stopPropagation()}
        onEdit={() => onEditCategory(category.id)}
        onDelete={() => onDeleteCategory(category.id)}
      />
    </>
  );
}

function CategoryDragOverlay({
  category,
  width
}: {
  category: Category;
  width: number | null;
}) {
  return (
    <div
      className="scale-[1.04]"
      style={width ? { width, minWidth: width } : undefined}
    >
      <PanelCardShell className="gap-2 py-3">
        <CategoryCardContent category={category} editing={false} draftName="" />
      </PanelCardShell>
    </div>
  );
}
