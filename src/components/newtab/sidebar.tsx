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
import { MoreVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import type { Category } from "../../types/models";

type SidebarProps = {
  categories: Category[];
  collapsed: boolean;
  onAddCategory: () => void;
  onSelectCategory: (categoryId: string) => void;
  editingCategoryId: string | null;
  pendingNewCategoryId: string | null;
  onEditingCategoryChange: (categoryId: string | null) => void;
  onPendingNewCategoryChange: (categoryId: string | null) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onCommitCategoryOrder: (categoryIds: string[]) => void;
};

export function Sidebar({
  categories,
  collapsed,
  onAddCategory,
  onSelectCategory,
  editingCategoryId,
  pendingNewCategoryId,
  onEditingCategoryChange,
  onPendingNewCategoryChange,
  onRenameCategory,
  onRemoveCategory,
  onCommitCategoryOrder
}: SidebarProps) {
  const [draftName, setDraftName] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [openMenuCategoryId, setOpenMenuCategoryId] = useState<string | null>(null);
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

  if (collapsed) {
    return null;
  }

  function commitRename(categoryId: string) {
    const value = draftName.trim();
    if (!value && pendingNewCategoryId === categoryId) {
      onRemoveCategory(categoryId);
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

  function handleDragStart(event: DragStartEvent) {
    setActiveCategoryId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCategoryId(null);

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
    <Card className="flex h-[calc(100vh-32px)] w-[260px] flex-col p-3">
      <div className="mb-3 flex min-h-10 items-center justify-between px-2 py-1">
        <div>
          <div className="text-[18px] font-semibold tracking-[-0.01em]">TabCard</div>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-lg border-border/70 bg-transparent text-foreground shadow-none hover:border-border hover:bg-transparent hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
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
        onDragCancel={() => setActiveCategoryId(null)}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {orderedCategories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                editingCategoryId={editingCategoryId}
                draftName={draftName}
                isDragging={activeCategoryId === category.id}
                isMenuOpen={openMenuCategoryId === category.id}
                onDraftNameChange={setDraftName}
                onEditCategory={onEditingCategoryChange}
                onCommitRename={commitRename}
                onDeleteCategory={onRemoveCategory}
                onMenuOpenChange={setOpenMenuCategoryId}
                onSelectCategory={onSelectCategory}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {draggedCategory ? <CategoryDragOverlay category={draggedCategory} /> : null}
        </DragOverlay>
      </DndContext>
    </Card>
  );
}

type SortableCategoryItemProps = {
  category: Category;
  editingCategoryId: string | null;
  draftName: string;
  isDragging: boolean;
  isMenuOpen: boolean;
  onDraftNameChange: (value: string) => void;
  onEditCategory: (categoryId: string | null) => void;
  onCommitRename: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMenuOpenChange: (categoryId: string | null) => void;
  onSelectCategory: (categoryId: string) => void;
};

function SortableCategoryItem({
  category,
  editingCategoryId,
  draftName,
  isDragging,
  isMenuOpen,
  onDraftNameChange,
  onEditCategory,
  onCommitRename,
  onDeleteCategory,
  onMenuOpenChange,
  onSelectCategory
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
    disabled: editingCategoryId === category.id
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={`relative flex w-full cursor-grab select-none items-center gap-2 rounded-xl border bg-card px-3 py-3 text-left transition-all ${
        sortableDragging || isDragging
          ? "border-dashed border-border/70 bg-transparent shadow-none"
          : "hover:border-border hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
      }`}
      onClick={() => onSelectCategory(category.id)}
      {...attributes}
      {...listeners}
    >
      <div
        className={`min-w-0 flex-1 overflow-hidden text-left ${
          sortableDragging || isDragging ? "opacity-0" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        {editingCategoryId === category.id ? (
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
      <DropdownMenu
        open={isMenuOpen}
        onOpenChange={(open) => onMenuOpenChange(open ? category.id : null)}
      >
        <DropdownMenuTrigger asChild>
          <Button
            data-role="category-menu"
            size="icon"
            type="button"
            variant="ghost"
            className={`h-8 w-8 shrink-0 cursor-pointer rounded-md hover:border-border hover:bg-transparent hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${
              sortableDragging || isDragging ? "opacity-0" : ""
            }`}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="top-9" align="end">
          <DropdownMenuItem
            onSelect={() => {
              onEditCategory(category.id);
            }}
          >
            编辑
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              onDeleteCategory(category.id);
            }}
          >
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CategoryDragOverlay({ category }: { category: Category }) {
  return (
    <div className="w-[236px] rounded-xl border border-border bg-white px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-black/5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
          {category.name}
        </div>
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
