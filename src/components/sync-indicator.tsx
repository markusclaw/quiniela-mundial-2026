"use client";

import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const REFRESH_MS = 5 * 60 * 1000; // re-check every 5 min while the app is open

/** Invisible: pulls results on open and on an interval. Mount once. */
export function ResultsAutoSync() {
  const { ready, syncNow } = usePool();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    void syncNow();
    const id = setInterval(() => void syncNow(), REFRESH_MS);
    return () => clearInterval(id);
  }, [ready, syncNow]);

  return null;
}

/** Small "live results" pill; click to refresh now. */
export function SyncIndicator({ className }: { className?: string }) {
  const { syncing, lastSync, syncNow } = usePool();
  const { t } = useT();

  return (
    <button
      onClick={() => void syncNow()}
      disabled={syncing}
      title={t("sync.tooltip")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {syncing ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
      )}
      {syncing ? t("sync.syncing") : t("sync.live")}
    </button>
  );
}
