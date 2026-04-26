import { Check, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useI18n } from "../../lib/i18n";
import type { TabInfo } from "../../services/tabs";
import type { Category } from "../../types/models";

type PopupPageProps = {
  categories: Category[];
  currentTab: TabInfo | null;
  savedCategoryId: string | null;
  isCreatingCategory?: boolean;
  draftName?: string;
  onAddCategory: () => void;
  onDraftNameChange?: (value: string) => void;
  onCommitCategoryName?: () => void;
  onCancelCategoryEditing?: () => void;
  onSaveAllTabsAndClose?: () => void;
  onSaveToCategory: (categoryId: string) => void;
};

export function PopupPage({
  categories,
  currentTab,
  savedCategoryId,
  isCreatingCategory = false,
  draftName = "",
  onAddCategory,
  onDraftNameChange = () => undefined,
  onCommitCategoryName = () => undefined,
  onCancelCategoryEditing = () => undefined,
  onSaveAllTabsAndClose = () => undefined,
  onSaveToCategory
}: PopupPageProps) {
  const { messages } = useI18n();
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);

  return (
    <div className="w-[380px] bg-background p-0 outline-none ring-0">
      <div className="overflow-hidden rounded-[24px] bg-background text-foreground shadow-none outline-none ring-0">
        <div className="flex flex-col bg-background p-3">
          <div className="space-y-2">
          {categories.map((category) => {
            const selected = category.id === savedCategoryId;

            return (
              <button
                key={category.id}
                type="button"
                disabled={!currentTab}
                className="relative flex w-full select-none items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-3 text-left text-sm text-foreground shadow-none transition-all hover:border-border hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:border-white/12 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
                onClick={() => onSaveToCategory(category.id)}
              >
                <div className="min-w-0 flex-1 overflow-hidden text-left">
                  <div className="flex h-9 items-center">
                    <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
                      {category.name}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={`ml-auto h-8 w-8 shrink-0 pointer-events-none rounded-full border-border/70 bg-transparent shadow-none ${
                    selected
                      ? "text-foreground"
                      : "text-transparent"
                  }`}
                  aria-label={selected ? messages.popup.saved : messages.popup.unsaved}
                  onFocus={() => setFocusedCategoryId(category.id)}
                  onBlur={() => setFocusedCategoryId((current) => (current === category.id ? null : current))}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </button>
            );
          })}

          {isCreatingCategory ? (
            <div className="relative flex w-full select-none items-center gap-2 rounded-xl border border-dashed border-border/70 bg-transparent px-3 py-3 text-left text-sm text-foreground shadow-none transition-all dark:border-white/10">
              <div className="min-w-0 flex-1 overflow-hidden text-left">
                <Input
                  autoFocus
                  className="h-9 w-full rounded-md border-border/60 bg-muted/30 px-2.5 shadow-none focus-visible:border-border/80 focus-visible:ring-0"
                  value={draftName}
                  onBlur={() => {
                    if (focusedCategoryId === "__create__") {
                      return;
                    }
                    onCommitCategoryName();
                  }}
                  onChange={(event) => onDraftNameChange(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onCommitCategoryName();
                    }

                    if (event.key === "Escape") {
                      onCancelCategoryEditing();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="ml-auto h-8 w-8 shrink-0 pointer-events-none rounded-full border-dashed border-border/70 bg-transparent text-transparent shadow-none dark:border-white/10"
                onFocus={() => setFocusedCategoryId("__create__")}
                onBlur={() =>
                  setFocusedCategoryId((current) => (current === "__create__" ? null : current))
                }
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-transparent px-3 py-3 text-left text-sm text-muted-foreground transition-all hover:border-border hover:text-foreground hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:hover:border-white/12 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
              onClick={() => onAddCategory()}
            >
              <div className="flex h-9 items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
            </button>
          )}

          <button
            type="button"
            className="flex w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-transparent px-3 py-3 text-center text-sm font-medium text-muted-foreground transition-all hover:border-border hover:text-foreground hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:hover:border-white/12 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
            onClick={onSaveAllTabsAndClose}
          >
            <div className="flex h-9 items-center justify-center">
              {messages.popup.saveAllTabs}
            </div>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
