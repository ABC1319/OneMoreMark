import * as React from "react";

import { cn } from "../../lib/utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used within DropdownMenu");
  }
  return context;
}

export function DropdownMenu({
  open,
  onOpenChange,
  children
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen: onOpenChange }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) {
  const { open, setOpen } = useDropdownMenuContext();

  const trigger = React.cloneElement(children, {
    "aria-expanded": open,
    "aria-haspopup": "menu",
    "data-state": open ? "open" : "closed",
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      setOpen(!open);
    }
  });

  if (asChild) {
    return trigger;
  }

  return <button type="button">{trigger}</button>;
}

export function DropdownMenuContent({
  className,
  align = "end",
  children
}: {
  className?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const { open, setOpen } = useDropdownMenuContext();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown() {
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, setOpen]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  onSelect,
  children
}: {
  className?: string;
  inset?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  const { setOpen } = useDropdownMenuContext();

  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent",
        inset && "pl-8",
        className
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
