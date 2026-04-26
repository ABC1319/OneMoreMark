import { useEffect, useRef, useState } from "react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { Input } from "../ui/input";
import { MAX_CUSTOM_ICON_LENGTH, normalizeStoredIcon } from "../../lib/favicon";
import { useI18n } from "../../lib/i18n";
import type { Bookmark } from "../../types/models";

type BookmarkEditDialogProps = {
  bookmark: Bookmark | null;
  onClose: () => void;
  onSave: (bookmark: Bookmark) => void;
};

export function BookmarkEditDialog({
  bookmark,
  onClose,
  onSave
}: BookmarkEditDialogProps) {
  const { messages } = useI18n();
  const [form, setForm] = useState<Bookmark | null>(bookmark);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  useEffect(() => {
    setForm(bookmark);
  }, [bookmark]);

  useEffect(() => {
    if (!bookmark) {
      setPosition({ x: 0, y: 0 });
    }
  }, [bookmark]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      setPosition({
        x: dragState.initialX + (event.clientX - dragState.startX),
        y: dragState.initialY + (event.clientY - dragState.startY)
      });
    }

    function handlePointerUp(event: PointerEvent) {
      if (dragStateRef.current?.pointerId === event.pointerId) {
        dragStateRef.current = null;
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  function handleHeaderPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!bookmark) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: position.x,
      initialY: position.y
    };
  }

  function handleSave() {
    if (!form) {
      return;
    }

    onSave({
      ...form,
      icon: normalizeStoredIcon(form.url, form.icon)
    });
  }

  return (
    <Dialog open={!!bookmark} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        style={{
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
        }}
      >
        <DialogHeader
          className="cursor-move select-none pr-10"
          onPointerDown={handleHeaderPointerDown}
        >
          <DialogTitle>{messages.bookmarkEdit.title}</DialogTitle>
          <DialogDescription>{messages.bookmarkEdit.description}</DialogDescription>
        </DialogHeader>

        {form ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.bookmarkEdit.name}</label>
              <Input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.bookmarkEdit.url}</label>
              <Input
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.bookmarkEdit.icon}</label>
              <Input
                maxLength={MAX_CUSTOM_ICON_LENGTH}
                placeholder={messages.bookmarkEdit.iconPlaceholder}
                value={form.icon}
                onChange={(event) => setForm({ ...form, icon: event.target.value })}
              />
              <div className="text-xs text-muted-foreground">
                {messages.bookmarkEdit.iconHelp.replace("{max}", String(MAX_CUSTOM_ICON_LENGTH))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {messages.common.cancel}
              </Button>
              <Button onClick={handleSave}>{messages.common.save}</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
