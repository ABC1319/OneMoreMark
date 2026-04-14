import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import type { Category } from "../../types/models";

type PopupPageProps = {
  categories: Category[];
  onAddCategory: (name: string) => void;
};

export function PopupPage({ categories, onAddCategory }: PopupPageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [value, setValue] = useState("");

  function handleCreate() {
    if (!value.trim()) {
      return;
    }

    onAddCategory(value);
    setValue("");
    setShowCreate(false);
  }

  return (
    <div className="w-[360px] bg-background p-3">
      <Card className="p-3">
        <div className="mb-3 flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setShowCreate((open) => !open)}>
            <Plus className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold">选择收藏到分类</div>
        </div>

        {showCreate ? (
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="输入分类名"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button onClick={handleCreate}>新增</Button>
          </div>
        ) : null}

        <div className="space-y-2">
          {categories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition hover:bg-accent"
            >
              <span>{category.name}</span>
              {index === 0 ? <span className="text-xs text-muted-foreground">已添加</span> : null}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
