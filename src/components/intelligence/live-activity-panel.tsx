"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { ActivityFeedItem } from "@/lib/data/activity-feed";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const TYPE_COLORS: Record<string, string> = {
  scan: "text-zinc-400",
  update: "text-blue-400",
  resale: "text-emerald-400",
  new: "text-purple-400",
  ai: "text-amber-400",
  drop: "text-orange-400",
};

export function LiveActivityPanel({ initialItems }: { initialItems?: ActivityFeedItem[] }) {
  const [items, setItems] = useState<ActivityFeedItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!initialItems);

  useEffect(() => {
    if (initialItems) return;

    let es: EventSource | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const applyItems = (items: ActivityFeedItem[]) => {
      setItems(items);
      setLoading(false);
    };

    const startPolling = () => {
      fetch("/api/activity-feed")
        .then((r) => r.json())
        .then((d) => applyItems(d.items ?? []))
        .catch(() => setLoading(false));
      pollId = setInterval(() => {
        fetch("/api/activity-feed").then((r) => r.json()).then((d) => applyItems(d.items ?? [])).catch(() => {});
      }, 30000);
    };

    try {
      es = new EventSource("/api/stream/activity");
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.items) applyItems(data.items);
        } catch { /* ignore malformed */ }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!pollId) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      es?.close();
      if (pollId) clearInterval(pollId);
    };
  }, [initialItems]);

  return (
    <aside className="activity-panel flex flex-col h-full border-l border-titan-border bg-titan-surface/50">
      <div className="px-3 py-2 border-b border-titan-border flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{t("feed.title")}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0">
        {loading && <div className="text-xs text-zinc-600 p-2">{t("feed.loading")}</div>}
        {!loading && items.length === 0 && (
          <div className="text-xs text-zinc-600 p-2">{t("feed.empty")}</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="activity-row py-2 border-b border-titan-border/40 last:border-0">
            <div className="text-[10px] font-mono text-zinc-600">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: nl })}
            </div>
            <div className={cn("text-[10px] font-medium uppercase", TYPE_COLORS[item.type] ?? "text-zinc-500")}>
              {item.source}
            </div>
            {item.release_id ? (
              <Link href={`/dashboard/releases/${item.release_id}`} className="text-xs text-zinc-200 hover:text-titan-accent leading-snug block">
                {item.headline}
              </Link>
            ) : (
              <div className="text-xs text-zinc-200 leading-snug">{item.headline}</div>
            )}
            {item.detail && <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{item.detail}</div>}
          </div>
        ))}
      </div>
    </aside>
  );
}
