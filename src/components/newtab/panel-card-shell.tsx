import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../../lib/utils";

type PanelCardShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  placeholder?: boolean;
  dragging?: boolean;
  highlighted?: boolean;
};

export const PanelCardShell = forwardRef<HTMLDivElement, PanelCardShellProps>(
  (
    {
      children,
      className,
      placeholder = false,
      dragging = false,
      highlighted = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-[60px] w-full select-none items-center rounded-xl border bg-card px-3 text-left transition-all outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
          placeholder
            ? "border-dashed border-border/70 bg-transparent shadow-none"
            : "border-border text-card-foreground shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]",
          !placeholder &&
            !dragging &&
            "hover:border-border hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:hover:border-white/12 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.32)]",
          highlighted && "border-border shadow-[0_0_0_1px_rgba(15,23,42,0.12)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PanelCardShell.displayName = "PanelCardShell";
