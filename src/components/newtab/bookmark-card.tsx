import { Pencil } from "lucide-react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import type { Bookmark } from "../../types/models";

type BookmarkCardProps = {
  bookmark: Bookmark;
  onEdit: () => void;
  dragging?: boolean;
};

export function BookmarkCard({ bookmark, onEdit, dragging = false }: BookmarkCardProps) {
  return (
    <Card
      className={`flex min-h-[88px] items-start gap-3 p-4 transition ${
        dragging
          ? "border-dashed border-black/30 bg-muted/70 shadow-none"
          : "hover:border-border hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
      }`}
    >
      <img
        src={bookmark.icon}
        alt=""
        className="mt-1 h-5 w-5 rounded"
        onError={(event) => {
          event.currentTarget.style.visibility = "hidden";
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-medium leading-5">
          {bookmark.title}
        </div>
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {bookmark.url}
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
    </Card>
  );
}
