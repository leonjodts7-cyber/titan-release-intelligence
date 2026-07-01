"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { ActivityFeedItem } from "@/lib/data/activity-feed";
import { cn } from "@/lib/utils";

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
    fetch("/api/activity-feed")
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
    const id = setInterval(() => {
      fetch("/api/activity-feed").then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [initialItems]);

  return (
    <aside className="activity-panel flex flex-col h-full border-l border-titan-border bg-titan-surface/50">
      <div className="px-3 py-2 border-b border-titan-border flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Live Feed</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0">
        {loading && <div className="text-xs text-zinc-600 p-2">Loading feed...</div>}
        {!loading && items.length === 0 && (
          <div className="text-xs text-zinc-600 p-2">No activity yet</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="activity-row py-2 border-b border-titan-border/40 last:border-0">
            <div className="text-[10px] font-mono text-zinc-600">{format(new Date(item.timestamp), "HH:mm")}</div>
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
