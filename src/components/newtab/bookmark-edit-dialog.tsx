import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
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
  const [form, setForm] = useState<Bookmark | null>(bookmark);

  useEffect(() => {
    setForm(bookmark);
  }, [bookmark]);

  return (
    <Dialog open={!!bookmark} onOpenChange={(open) => !open && onClose()} title="编辑网站">
      {form ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Icon 链接</label>
            <Input
              value={form.icon}
              onChange={(event) => setForm({ ...form, icon: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">网站名称</label>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">网站链接</label>
            <Input
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={() => form && onSave(form)}>保存</Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
