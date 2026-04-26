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
import type { LocaleMode } from "../../types/models";

type LanguageDialogProps = {
  open: boolean;
  localeMode: LocaleMode;
  onOpenChange: (open: boolean) => void;
  onLocaleModeChange: (localeMode: LocaleMode) => void;
};

export function LanguageDialog({
  open,
  localeMode,
  onOpenChange,
  onLocaleModeChange
}: LanguageDialogProps) {
  const { messages } = useI18n();

  const options = useMemo<Array<{ value: LocaleMode; label: string; description: string }>>(
    () => [
      {
        value: "system",
        label: messages.language.options.system.label,
        description: messages.language.options.system.description
      },
      {
        value: "zh-CN",
        label: messages.language.options["zh-CN"].label,
        description: messages.language.options["zh-CN"].description
      },
      {
        value: "en",
        label: messages.language.options.en.label,
        description: messages.language.options.en.description
      }
    ],
    [messages]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[360px] rounded-2xl p-5">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-[18px] font-semibold">{messages.language.title}</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {messages.language.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {options.map((option) => {
            const selected = localeMode === option.value;

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
                  onLocaleModeChange(option.value);
                  onOpenChange(false);
                }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
                </div>
                <span
                  className={`ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    selected ? "border-foreground text-foreground" : "border-border text-transparent"
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
