import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { useI18n } from "../../lib/i18n";
import type { Category } from "../../types/models";

type DeleteCategoryDialogProps = {
  category: Category | null;
  bookmarkCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteCategoryDialog({
  category,
  bookmarkCount,
  onCancel,
  onConfirm
}: DeleteCategoryDialogProps) {
  const { messages } = useI18n();
  const open = Boolean(category);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent showCloseButton={false} className="max-w-[360px] rounded-2xl p-5">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-[18px] font-semibold">{messages.deleteCategory.title}</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {category ? (
              messages.deleteCategory.description
                .replace("{name}", category.name)
                .replace("{count}", String(bookmarkCount))
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="-mx-5 -mb-5 rounded-b-2xl bg-transparent px-5 py-4">
          <Button
            variant="outline"
            className="rounded-xl border-border/70 bg-card shadow-none"
            onClick={onCancel}
          >
            {messages.common.cancel}
          </Button>
          <Button
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onConfirm}
          >
            {messages.deleteCategory.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
