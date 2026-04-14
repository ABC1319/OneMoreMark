import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Search, MoreVertical } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from "react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import type { Bookmark, Category } from "../../types/models";
import { BookmarkCard } from "./bookmark-card";

type Group = {
  category: Category;
  items: Bookmark[];
};

type ContentPanelProps = {
  groups: Group[];
  search: string;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  onEditBookmark: (bookmark: Bookmark) => void;
  activeCategoryId: string | null;
  onCommitBookmarkLayout: (
    layout: Array<{ id: string; categoryId: string; order: number }>
  ) => void;
};

export function ContentPanel({
  groups,
  search,
  onSearchChange,
  onToggleSidebar,
  onEditBookmark,
  activeCategoryId,
  onCommitBookmarkLayout
}: ContentPanelProps) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [previewGroups, setPreviewGroups] = useState<Group[]>(groups);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );

  const menuItems = useMemo(
    () => ["全部合并", "全部展开", "导出", "导入", "主题"],
    []
  );

  useEffect(() => {
    if (!activeBookmarkId) {
      setPreviewGroups(groups);
    }
  }, [activeBookmarkId, groups]);

  useEffect(() => {
    if (!activeCategoryId) {
      return;
    }

    sectionRefs.current[activeCategoryId]?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, [activeCategoryId]);

  const draggedBookmark =
    previewGroups.flatMap((group) => group.items).find((item) => item.id === activeBookmarkId) ??
    null;

  function moveBookmarkPreview(activeId: string, overId: string, overType: "card" | "group") {
    setPreviewGroups((current) => {
      const nextGroups = current.map((group) => ({
        ...group,
        items: [...group.items]
      }));

      let activeBookmark: Bookmark | null = null;
      let sourceGroupIndex = -1;

      nextGroups.forEach((group, groupIndex) => {
        const bookmarkIndex = group.items.findIndex((item) => item.id === activeId);
        if (bookmarkIndex >= 0) {
          activeBookmark = group.items[bookmarkIndex];
          sourceGroupIndex = groupIndex;
          group.items.splice(bookmarkIndex, 1);
        }
      });

      if (!activeBookmark) {
        return current;
      }

      if (overType === "group") {
        const targetGroup = nextGroups.find((group) => group.category.id === overId);
        if (!targetGroup) {
          return current;
        }
        targetGroup.items.push({ ...activeBookmark, categoryId: targetGroup.category.id });
        return nextGroups;
      }

      for (const group of nextGroups) {
        const targetIndex = group.items.findIndex((item) => item.id === overId);
        if (targetIndex >= 0) {
          group.items.splice(targetIndex, 0, {
            ...activeBookmark,
            categoryId: group.category.id
          });
          return nextGroups;
        }
      }

      if (sourceGroupIndex >= 0) {
        nextGroups[sourceGroupIndex].items.push(activeBookmark);
      }

      return nextGroups;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveBookmarkId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const overData = over.data.current as
      | { type: "card"; categoryId: string }
      | { type: "group"; categoryId: string }
      | undefined;

    if (!overData) {
      return;
    }

    moveBookmarkPreview(
      String(active.id),
      overData.type === "group" ? overData.categoryId : String(over.id),
      overData.type
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over } = event;
    if (!over) {
      setActiveBookmarkId(null);
      setPreviewGroups(groups);
      return;
    }

    const layout = previewGroups.flatMap((group) =>
      group.items.map((item, index) => ({
        id: item.id,
        categoryId: group.category.id,
        order: index
      }))
    );
    onCommitBookmarkLayout(layout);
    setActiveBookmarkId(null);
  }

  return (
    <div className="flex-1">
      <Card className="flex h-[calc(100vh-32px)] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="text-lg font-semibold">内容区</div>
          <Button size="icon" variant="outline" onClick={onToggleSidebar}>
            <span className="text-base">≡</span>
          </Button>
          <div className="relative ml-2 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索标题或网址"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label={menuItems.join(" / ")}
            title={menuItems.join(" / ")}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <DndContext
            collisionDetection={closestCenter}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setActiveBookmarkId(null);
              setPreviewGroups(groups);
            }}
          >
            <div className="space-y-6">
              {previewGroups.map((group) => (
                <CategoryBookmarkSection
                  key={group.category.id}
                  group={group}
                  activeBookmarkId={activeBookmarkId}
                  onEditBookmark={onEditBookmark}
                  sectionRefs={sectionRefs}
                />
              ))}

              {!previewGroups.some((group) => group.items.length > 0) && (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  没有找到匹配的网站
                </Card>
              )}
            </div>

            <DragOverlay dropAnimation={null}>
              {draggedBookmark ? (
                <div className="w-[280px] scale-[1.04] rotate-[-1deg]">
                  <BookmarkCard bookmark={draggedBookmark} onEdit={() => undefined} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </Card>
    </div>
  );
}

function CategoryBookmarkSection({
  group,
  activeBookmarkId,
  onEditBookmark,
  sectionRefs
}: {
  group: Group;
  activeBookmarkId: string | null;
  onEditBookmark: (bookmark: Bookmark) => void;
  sectionRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <section
      ref={(node) => {
        sectionRefs.current[group.category.id] = node;
      }}
      className="space-y-3"
    >
      <div className="border-b pb-2 text-base font-semibold">{group.category.name}</div>
      <SortableContext
        items={group.items.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <CategoryDropZone categoryId={group.category.id}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {group.items.map((bookmark) => (
              <SortableBookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                dragging={activeBookmarkId === bookmark.id}
                onEdit={() => onEditBookmark(bookmark)}
              />
            ))}
          </div>
        </CategoryDropZone>
      </SortableContext>
    </section>
  );
}

function CategoryDropZone({
  categoryId,
  children
}: {
  categoryId: string;
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
      className={isOver ? "rounded-2xl border border-dashed border-black/25 p-2" : ""}
    >
      {children}
    </div>
  );
}

function SortableBookmarkCard({
  bookmark,
  onEdit,
  dragging
}: {
  bookmark: Bookmark;
  onEdit: () => void;
  dragging: boolean;
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
        transform: CSS.Transform.toString(transform),
        transition
      }}
      {...attributes}
      {...listeners}
    >
      <BookmarkCard
        bookmark={bookmark}
        dragging={dragging || isDragging}
        onEdit={onEdit}
      />
    </div>
  );
}
