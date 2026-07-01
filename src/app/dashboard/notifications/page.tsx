import { getNotifications } from "@/lib/data/notifications";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { formatDate, priorityColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-zinc-500 text-sm mt-1">{notifications.length} alerts in history</p>
        </div>

        <div className="space-y-2">
          {notifications.map((n) => {
            const priority = (n.metadata?.priority as string) ?? "HIGH";
            const isUnread = n.status !== "read";
            return (
              <div
                key={n.id}
                className={cn(
                  "p-4 rounded-xl border transition-colors",
                  isUnread
                    ? "bg-titan-surface border-titan-accent/30"
                    : "bg-titan-surface border-titan-border opacity-70"
                )}
              >
                <div className="flex items-start gap-3">
                  <Bell className={cn("w-4 h-4 mt-0.5", isUnread ? "text-titan-accent" : "text-zinc-600")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {n.release_id ? (
                        <Link href={`/dashboard/releases/${n.release_id}`} className="font-medium text-sm truncate hover:text-titan-accent">
                          {n.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-sm truncate">{n.title}</span>
                      )}
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0", priorityColor(priority))}>
                        {priority}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">{n.body}</p>
                    <p className="text-xs text-zinc-600 mt-1">{formatDate(n.created_at)} · {n.channel}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
