import { Check } from "lucide-react";
import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { useI18n } from "../../lib/i18n";
import type { ThemeMode } from "../../types/models";

type ThemeDialogProps = {
  open: boolean;
  themeMode: ThemeMode;
  onOpenChange: (open: boolean) => void;
  onThemeModeChange: (themeMode: ThemeMode) => void;
};

export function ThemeDialog({
  open,
  themeMode,
  onOpenChange,
  onThemeModeChange
}: ThemeDialogProps) {
  const { messages } = useI18n();

  const themeOptions = useMemo<
    Array<{ value: ThemeMode; label: string; description: string }>
  >(
    () => [
      {
        value: "light",
        label: messages.theme.options.light.label,
        description: messages.theme.options.light.description
      },
      {
        value: "dark",
        label: messages.theme.options.dark.label,
        description: messages.theme.options.dark.description
      },
      {
        value: "system",
        label: messages.theme.options.system.label,
        description: messages.theme.options.system.description
      }
    ],
    [messages]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[360px] rounded-2xl p-5">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-[18px] font-semibold">{messages.theme.title}</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {messages.theme.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {themeOptions.map((option) => {
            const selected = themeMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between rounded-xl border bg-card px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-foreground shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-white/85 dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]"
                    : "border-border hover:border-border/80 dark:hover:border-white/12"
                }`}
                onClick={() => {
                  onThemeModeChange(option.value);
                  onOpenChange(false);
                }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
                </div>
                <span
                  className={`ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    selected
                      ? "border-foreground text-foreground"
                      : "border-border text-transparent"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
