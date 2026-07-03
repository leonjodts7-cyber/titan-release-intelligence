"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/types";
import { cn, formatDate, priorityColor } from "@/lib/utils";
import { t } from "@/lib/i18n";

export function NotificationsClient({ initial }: { initial: Notification[] }) {
  const [items, setItems] = useState(initial);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "read" as const, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => n.status !== "read");
    await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })));
    setItems((prev) => prev.map((n) => ({ ...n, status: "read" as const, read_at: new Date().toISOString() })));
  };

  const unread = items.filter((n) => n.status !== "read").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-titan-muted">
          {t("notifications.unreadCount", { unread, total: items.length })}
        </p>
        {unread > 0 && (
          <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[10px] text-titan-accent hover:underline">
            <CheckCheck className="w-3 h-3" /> {t("notifications.markAllRead")}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {items.map((n) => {
          const priority = (n.metadata?.priority as string) ?? "HIGH";
          const isUnread = n.status !== "read";
          return (
            <div key={n.id} className={cn("intel-card py-2.5", isUnread && "border-titan-accent/30")}>
              <div className="flex items-start gap-2">
                <Bell className={cn("w-3.5 h-3.5 mt-0.5", isUnread ? "text-titan-accent" : "text-zinc-600")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {n.release_id || (n.metadata?.release_slug as string) ? (
                      <Link
                        href={
                          n.metadata?.release_slug
                            ? `/dashboard/drops/${n.metadata.release_slug}`
                            : `/dashboard/drops/${n.release_id}`
                        }
                        className="font-medium text-xs truncate hover:text-titan-accent"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-xs truncate">{n.title}</span>
                    )}
                    <span className={cn("text-[9px] px-1 py-0 rounded border shrink-0", priorityColor(priority))}>
                      {priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{n.body}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[9px] text-zinc-600">{formatDate(n.created_at)} · {t("notifications.channelInApp")}</p>
                    {isUnread && (
                      <button onClick={() => markRead(n.id)} className="text-[9px] text-titan-accent hover:underline">
                        {t("terms.markRead")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
