import { ChevronLeft, ChevronRight, MoreVertical, Search } from "lucide-react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { useI18n } from "../../lib/i18n";

type ContentToolbarProps = {
  search: string;
  sidebarCollapsed: boolean;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenSyncStatus: () => void;
  onOpenTheme: () => void;
  onOpenLanguage: () => void;
};

export function ContentToolbar({
  search,
  sidebarCollapsed,
  onSearchChange,
  onToggleSidebar,
  onCollapseAll,
  onExpandAll,
  onExport,
  onImport,
  onOpenSyncStatus,
  onOpenTheme,
  onOpenLanguage
}: ContentToolbarProps) {
  const { messages } = useI18n();
  const menuItems = [
    messages.toolbar.collapseAll,
    messages.toolbar.expandAll,
    messages.toolbar.export,
    messages.toolbar.import,
    messages.toolbar.syncStatus,
    messages.toolbar.theme,
    messages.toolbar.language
  ];

  return (
    <div className="mb-3 flex min-h-10 items-center justify-between px-2 py-1">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-lg border-border/70 bg-transparent text-foreground shadow-none hover:border-border hover:bg-transparent hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:hover:border-white/12 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
          onClick={onToggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        <div className="relative w-[240px] max-w-[40vw]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={messages.toolbar.searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={menuItems.join(" / ")}
          title={menuItems.join(" / ")}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground/85 transition-colors outline-none ring-0 hover:text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-transparent"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="min-w-[104px] rounded-xl p-1 shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]"
        >
          <ToolbarMenuItem onClick={onCollapseAll}>{messages.toolbar.collapseAll}</ToolbarMenuItem>
          <ToolbarMenuItem onClick={onExpandAll}>{messages.toolbar.expandAll}</ToolbarMenuItem>
          <ToolbarMenuItem onClick={onExport}>{messages.toolbar.export}</ToolbarMenuItem>
          <ToolbarMenuItem onClick={onImport}>{messages.toolbar.import}</ToolbarMenuItem>
          <ToolbarMenuItem onClick={onOpenSyncStatus}>{messages.toolbar.syncStatus}</ToolbarMenuItem>
          <ToolbarMenuItem onClick={onOpenTheme}>{messages.toolbar.theme}</ToolbarMenuItem>
          <ToolbarMenuItem onClick={onOpenLanguage}>{messages.toolbar.language}</ToolbarMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ToolbarMenuItem({
  children,
  onClick
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      className="cursor-pointer rounded-lg bg-transparent px-2.5 py-1.5 text-sm text-foreground hover:bg-transparent focus:bg-transparent"
      onClick={onClick}
    >
      {children}
    </DropdownMenuItem>
  );
}
