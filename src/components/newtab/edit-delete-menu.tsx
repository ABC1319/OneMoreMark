import { MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { useI18n } from "../../lib/i18n";

type EditDeleteMenuProps = {
  hidden?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onTriggerClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onTriggerPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onContentClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

export function EditDeleteMenu({
  hidden = false,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onTriggerClick,
  onTriggerPointerDown,
  onContentClick
}: EditDeleteMenuProps) {
  const { messages } = useI18n();

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        data-role="category-menu"
        nativeButton={false}
        render={<div />}
        className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground/85 shadow-none transition-colors outline-none ring-0 hover:text-foreground focus:border-transparent focus:outline-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 active:border-transparent ${
          hidden ? "opacity-0" : ""
        }`}
        onClick={onTriggerClick}
        onPointerDown={onTriggerPointerDown}
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={2}
        align="end"
        className="w-fit min-w-0 rounded-xl p-1 shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]"
        onClick={onContentClick}
      >
        <DropdownMenuItem
          className="cursor-pointer rounded-lg bg-transparent px-2 py-1.5 text-[13px] text-foreground hover:bg-transparent focus:bg-transparent"
          onClick={onEdit}
        >
          {messages.common.edit}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-1 my-1 bg-border" />
        <DropdownMenuItem
          className="cursor-pointer rounded-lg bg-transparent px-2 py-1.5 text-[13px] text-foreground hover:bg-transparent focus:bg-transparent"
          onClick={onDelete}
        >
          {messages.common.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
