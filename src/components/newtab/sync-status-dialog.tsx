import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useI18n } from "../../lib/i18n";
import type { ManualSyncResult, SyncSnapshot } from "../../services/storage";

type SyncStatusDialogProps = {
  open: boolean;
  syncing: boolean;
  snapshot: SyncSnapshot | null;
  onOpenChange: (open: boolean) => void;
  onSync: () => Promise<ManualSyncResult>;
};

function formatTime(value: number | null, locale: string, emptyText: string) {
  if (!value) {
    return emptyText;
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(value);
}

function formatSize(size: number) {
  if (size <= 0) {
    return "0 B";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

export function SyncStatusDialog({
  open,
  syncing,
  snapshot,
  onOpenChange,
  onSync
}: SyncStatusDialogProps) {
  const { locale, messages } = useI18n();
  const syncUnavailable = !snapshot?.cloud.available;
  const cloudStatus = syncUnavailable
    ? messages.sync.unavailable
    : snapshot.cloud.oversized
      ? messages.sync.oversized
      : snapshot.cloud.updatedAt
        ? messages.sync.connected
        : messages.sync.noCloudData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[420px] rounded-2xl p-5">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-[18px] font-semibold">{messages.sync.title}</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {messages.sync.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs font-medium text-muted-foreground">{messages.sync.localUpdatedAt}</div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {formatTime(snapshot?.local.updatedAt ?? null, locale, messages.sync.noTime)}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">{messages.sync.cloudStatus}</div>
                <div className="mt-1 text-sm font-medium leading-6 text-foreground">
                  {cloudStatus}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{messages.sync.chunks} {snapshot?.cloud.chunkCount ?? 0}</div>
                <div className="mt-1">{messages.sync.size} {formatSize(snapshot?.cloud.size ?? 0)}</div>
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="text-xs font-medium text-muted-foreground">{messages.sync.cloudUpdatedAt}</div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {formatTime(snapshot?.cloud.updatedAt ?? null, locale, messages.sync.noTime)}
              </div>
            </div>
          </div>
        </div>

        {!syncUnavailable ? (
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => void onSync()}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {messages.sync.syncNow}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
