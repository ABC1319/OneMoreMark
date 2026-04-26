import {
  closestCenter,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BookmarkGroup } from "../components/newtab/category-bookmark-section";

type BookmarkDropTarget = {
  type: "card" | "group" | "empty-group";
  categoryId: string;
  id: string;
};

type UseBookmarkDragParams = {
  groups: BookmarkGroup[];
  activeCategoryId: string | null;
  bookmarkDragPointer: { x: number; y: number } | null;
  sidebarBoundaryRight: number | null;
  sidebarDropCategoryId: string | null;
  onCommitBookmarkLayout: (
    layout: Array<{ id: string; categoryId: string; order: number }>
  ) => void;
  onBookmarkDragStateChange: (bookmarkId: string | null) => void;
  onMoveBookmarkToCategoryEnd: (bookmarkId: string, categoryId: string) => void;
};

export function useBookmarkDrag({
  groups,
  activeCategoryId,
  bookmarkDragPointer,
  sidebarBoundaryRight,
  sidebarDropCategoryId,
  onCommitBookmarkLayout,
  onBookmarkDragStateChange,
  onMoveBookmarkToCategoryEnd
}: UseBookmarkDragParams) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastAutoScrollPointerRef = useRef<string | null>(null);
  const previewGroupsRef = useRef<BookmarkGroup[]>(groups);
  const lockedScrollTopRef = useRef<number | null>(null);
  const lastOverTargetRef = useRef<BookmarkDropTarget | null>(null);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [previewGroups, setPreviewGroups] = useState<BookmarkGroup[]>(groups);
  const [frozenPreviewGroups, setFrozenPreviewGroups] = useState<BookmarkGroup[] | null>(null);
  const [lockedSectionHeights, setLockedSectionHeights] = useState<Record<string, number>>({});
  const [dragPointerX, setDragPointerX] = useState<number | null>(null);
  const [dragPointerY, setDragPointerY] = useState<number | null>(null);
  const [freezePreviewActive, setFreezePreviewActive] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const pointerGroupCollision = pointerIntersections.find((collision) => {
        const container = args.droppableContainers.find((item) => item.id === collision.id);
        if (!container?.data.current) {
          return false;
        }
        const type = container?.data.current?.type;
        if (type !== "group" && type !== "empty-group") {
          return false;
        }

        const categoryId = String(container.data.current.categoryId);
        const group = previewGroups.find((item) => item.category.id === categoryId);
        return group?.items.length === 0;
      });

      if (pointerGroupCollision) {
        return [pointerGroupCollision];
      }

      const collisions =
        pointerIntersections.length > 0 ? pointerIntersections : closestCorners(args);

      const firstCollision = collisions[0];
      if (!firstCollision) {
        return [];
      }

      const overContainer = args.droppableContainers.find(
        (container) => container.id === firstCollision.id
      );
      const overType = overContainer?.data.current?.type;

      if (overType === "card") {
        return [firstCollision];
      }

      if (overType === "group") {
        const overGroup = previewGroups.find(
          (group) => `group:${group.category.id}` === String(firstCollision.id)
        );

        if (overGroup && overGroup.items.length > 0) {
          const itemIds = new Set(overGroup.items.map((item) => item.id));
          const cardContainers = args.droppableContainers.filter(
            (container) =>
              container.data.current?.type === "card" && itemIds.has(String(container.id))
          );

          const cardCollisions = closestCenter({
            ...args,
            droppableContainers: cardContainers
          });

          if (cardCollisions.length > 0) {
            return cardCollisions;
          }
        }
      }

      return [firstCollision];
    },
    [previewGroups]
  );

  useEffect(() => {
    if (!activeBookmarkId) {
      setPreviewGroups(groups);
    }
  }, [activeBookmarkId, groups]);

  useEffect(() => {
    previewGroupsRef.current = previewGroups;
  }, [previewGroups]);

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
  const shouldFreezePreview =
    freezePreviewActive ||
    (dragPointerX !== null && sidebarBoundaryRight !== null && dragPointerX <= sidebarBoundaryRight);
  const renderedGroups = frozenPreviewGroups ?? previewGroups;

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !shouldFreezePreview) {
      lockedScrollTopRef.current = null;
      return;
    }

    const lockedScrollTop = scrollContainer.scrollTop;
    lockedScrollTopRef.current = lockedScrollTop;
    const restoreScroll = () => {
      if (scrollContainer.scrollTop !== lockedScrollTop) {
        scrollContainer.scrollTop = lockedScrollTop;
      }
    };

    scrollContainer.addEventListener("scroll", restoreScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", restoreScroll);
    };
  }, [shouldFreezePreview]);

  useEffect(() => {
    if (!activeBookmarkId || !bookmarkDragPointer) {
      lastAutoScrollPointerRef.current = null;
      return;
    }

    if (shouldFreezePreview) {
      lastAutoScrollPointerRef.current = null;
      return;
    }

    const pointerKey = `${Math.round(bookmarkDragPointer.x)}:${Math.round(bookmarkDragPointer.y)}`;
    const pointerChanged = lastAutoScrollPointerRef.current !== pointerKey;
    lastAutoScrollPointerRef.current = pointerKey;

    if (!pointerChanged) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const rect = scrollContainer.getBoundingClientRect();
    const edgeOffset = 24;
    const scrollStep = 18;
    const insideHorizontally =
      bookmarkDragPointer.x >= rect.left && bookmarkDragPointer.x <= rect.right;

    if (!insideHorizontally) {
      return;
    }

    if (bookmarkDragPointer.y <= rect.top + edgeOffset) {
      scrollContainer.scrollBy({ top: -scrollStep });
    } else if (bookmarkDragPointer.y >= rect.bottom - edgeOffset) {
      scrollContainer.scrollBy({ top: scrollStep });
    }
  }, [activeBookmarkId, bookmarkDragPointer, shouldFreezePreview]);

  function buildBookmarkLayout(nextGroups: BookmarkGroup[]) {
    return nextGroups.flatMap((group) =>
      group.items.map((item, index) => ({
        id: item.id,
        categoryId: group.category.id,
        order: index
      }))
    );
  }

  function moveBookmarkAcrossGroups(
    currentGroups: BookmarkGroup[],
    activeId: string,
    targetCategoryId: string
  ) {
    const sourceGroupIndex = currentGroups.findIndex((group) =>
      group.items.some((item) => item.id === activeId)
    );
    if (sourceGroupIndex < 0) {
      return currentGroups;
    }

    const sourceBookmarkIndex = currentGroups[sourceGroupIndex].items.findIndex(
      (item) => item.id === activeId
    );
    if (sourceBookmarkIndex < 0) {
      return currentGroups;
    }

    const targetGroupIndex = currentGroups.findIndex(
      (group) => group.category.id === targetCategoryId
    );
    if (targetGroupIndex < 0 || sourceGroupIndex === targetGroupIndex) {
      return currentGroups;
    }

    const activeBookmark = currentGroups[sourceGroupIndex].items[sourceBookmarkIndex];
    const nextGroups = currentGroups.map((group) => ({
      ...group,
      items: [...group.items]
    }));

    nextGroups[sourceGroupIndex].items.splice(sourceBookmarkIndex, 1);
    nextGroups[targetGroupIndex].items.push({
      ...activeBookmark,
      categoryId: targetCategoryId
    });

    return nextGroups;
  }

  function moveBookmarkToCard(currentGroups: BookmarkGroup[], activeId: string, overId: string) {
    const sourceGroupIndex = currentGroups.findIndex((group) =>
      group.items.some((item) => item.id === activeId)
    );
    if (sourceGroupIndex < 0) {
      return currentGroups;
    }

    const sourceBookmarkIndex = currentGroups[sourceGroupIndex].items.findIndex(
      (item) => item.id === activeId
    );
    if (sourceBookmarkIndex < 0) {
      return currentGroups;
    }

    let targetGroupIndex = -1;
    let targetIndex = -1;
    for (let groupIndex = 0; groupIndex < currentGroups.length; groupIndex += 1) {
      const bookmarkIndex = currentGroups[groupIndex].items.findIndex((item) => item.id === overId);
      if (bookmarkIndex >= 0) {
        targetGroupIndex = groupIndex;
        targetIndex = bookmarkIndex;
        break;
      }
    }

    if (targetGroupIndex < 0 || targetIndex < 0) {
      return currentGroups;
    }

    if (sourceGroupIndex === targetGroupIndex) {
      const nextGroups = currentGroups.map((group) => ({
        ...group,
        items: [...group.items]
      }));
      nextGroups[targetGroupIndex] = {
        ...nextGroups[targetGroupIndex],
        items: arrayMove(currentGroups[targetGroupIndex].items, sourceBookmarkIndex, targetIndex)
      };
      return nextGroups;
    }

    const activeBookmark = currentGroups[sourceGroupIndex].items[sourceBookmarkIndex];
    const nextGroups = currentGroups.map((group) => ({
      ...group,
      items: [...group.items]
    }));

    nextGroups[sourceGroupIndex].items.splice(sourceBookmarkIndex, 1);
    nextGroups[targetGroupIndex].items.splice(targetIndex, 0, {
      ...activeBookmark,
      categoryId: nextGroups[targetGroupIndex].category.id
    });

    return nextGroups;
  }

  function moveBookmarkPreview(activeId: string, overId: string) {
    setPreviewGroups((current) => moveBookmarkToCard(current, activeId, overId));
  }

  function resetDragState() {
    setActiveBookmarkId(null);
    setLockedSectionHeights({});
    lastOverTargetRef.current = null;
    lastAutoScrollPointerRef.current = null;
    setPreviewGroups(groups);
    setFreezePreviewActive(false);
    setFrozenPreviewGroups(null);
    dragStartPointerRef.current = null;
    setDragPointerX(null);
    setDragPointerY(null);
    onBookmarkDragStateChange(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const activatorEvent = event.activatorEvent;
    if (
      activatorEvent instanceof MouseEvent ||
      activatorEvent instanceof PointerEvent ||
      activatorEvent instanceof TouchEvent
    ) {
      const clientX =
        activatorEvent instanceof TouchEvent
          ? activatorEvent.touches[0]?.clientX ?? 0
          : activatorEvent.clientX;
      const clientY =
        activatorEvent instanceof TouchEvent
          ? activatorEvent.touches[0]?.clientY ?? 0
          : activatorEvent.clientY;
      dragStartPointerRef.current = {
        x: clientX,
        y: clientY
      };
      setDragPointerX(clientX);
      setDragPointerY(clientY);
    } else {
      dragStartPointerRef.current = null;
      setDragPointerX(null);
      setDragPointerY(null);
    }

    const nextLockedHeights: Record<string, number> = {};
    Object.entries(sectionRefs.current).forEach(([categoryId, node]) => {
      if (node) {
        nextLockedHeights[categoryId] = node.getBoundingClientRect().height;
      }
    });
    setLockedSectionHeights(nextLockedHeights);
    setActiveBookmarkId(String(event.active.id));
    lastOverTargetRef.current = null;
    lastAutoScrollPointerRef.current = null;
    setFreezePreviewActive(false);
    setFrozenPreviewGroups(null);
    onBookmarkDragStateChange(String(event.active.id));
  }

  function handleDragMove(event: DragMoveEvent) {
    if (!dragStartPointerRef.current) {
      return;
    }

    const nextPointerX = dragStartPointerRef.current.x + event.delta.x;
    const nextPointerY = dragStartPointerRef.current.y + event.delta.y;
    setDragPointerX(nextPointerX);
    setDragPointerY(nextPointerY);

    const nextShouldFreeze =
      sidebarBoundaryRight !== null && nextPointerX <= sidebarBoundaryRight;

    if (nextShouldFreeze) {
      lastAutoScrollPointerRef.current = null;
      if (!freezePreviewActive) {
        setFrozenPreviewGroups(previewGroupsRef.current);
        setFreezePreviewActive(true);
      }

      const scrollContainer = scrollContainerRef.current;
      const lockedScrollTop = lockedScrollTopRef.current;
      if (
        scrollContainer &&
        lockedScrollTop !== null &&
        scrollContainer.scrollTop !== lockedScrollTop
      ) {
        scrollContainer.scrollTop = lockedScrollTop;
      }
      return;
    }

    if (freezePreviewActive) {
      setFreezePreviewActive(false);
      setFrozenPreviewGroups(null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    if (shouldFreezePreview) {
      return;
    }

    const overData = over.data.current as
      | { type: "card"; categoryId: string }
      | { type: "group"; categoryId: string }
      | { type: "empty-group"; categoryId: string }
      | undefined;

    if (!overData) {
      return;
    }

    lastOverTargetRef.current = {
      type: overData.type,
      categoryId: overData.categoryId,
      id: String(over.id)
    };

    if (overData.type !== "card") {
      return;
    }

    moveBookmarkPreview(String(active.id), String(over.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const overData =
      lastOverTargetRef.current ??
      (over?.data.current as
        | { type: "card"; categoryId: string }
        | { type: "group"; categoryId: string }
        | { type: "empty-group"; categoryId: string }
        | undefined);

    if (sidebarDropCategoryId) {
      onMoveBookmarkToCategoryEnd(String(active.id), sidebarDropCategoryId);
      resetDragState();
      return;
    }

    if (!overData) {
      resetDragState();
      return;
    }

    const sourceCategoryId =
      groups.find((group) => group.items.some((item) => item.id === String(active.id)))?.category
        .id ?? null;

    let nextGroups = previewGroups;

    if (overData.type === "group" || overData.type === "empty-group") {
      if (sourceCategoryId && sourceCategoryId === overData.categoryId) {
        nextGroups = previewGroups;
      } else {
        nextGroups = moveBookmarkAcrossGroups(groups, String(active.id), overData.categoryId);
      }
    } else if (overData.type === "card") {
      nextGroups = previewGroups;
    }

    onCommitBookmarkLayout(buildBookmarkLayout(nextGroups));
    resetDragState();
  }

  return {
    activeBookmarkId,
    collisionDetection,
    draggedBookmark,
    handleDragCancel: resetDragState,
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
  };
}
