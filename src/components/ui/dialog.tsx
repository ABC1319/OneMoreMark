import * as React from "react";

import { cn } from "../../lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div
        className={cn(
          "relative z-10 grid w-full max-w-lg gap-4 rounded-xl border bg-popover p-6 shadow-lg"
        )}
      >
        <div className="flex flex-col space-y-1.5 text-left">
          <div className="text-lg font-semibold leading-none tracking-tight">{title}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
