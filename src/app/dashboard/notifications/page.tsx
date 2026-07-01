import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { formatDate, priorityColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    title: "[EXTREME] Nike Mercurial Limited Drop",
    body: "Release within 24 hours. Hype 88 | Sellout 94%",
    priority: "EXTREME",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
  {
    id: "2",
    title: "[EXTREME] Taylor Swift Stadium Show",
    body: "Presale now active. General sale in 3 days.",
    priority: "EXTREME",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    read: false,
  },
  {
    id: "3",
    title: "[HIGH] Adidas F50 Limited",
    body: "New release detected from Adidas Confirmed",
    priority: "HIGH",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
  {
    id: "4",
    title: "Date Changed: Coldplay Europe Tour",
    body: "Presale date announced for Coldplay Europe Tour",
    priority: "EXTREME",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    read: true,
  },
];

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-zinc-500 text-sm mt-1">In-app alerts and notification history</p>
        </div>

        <div className="space-y-2">
          {MOCK_NOTIFICATIONS.map((n) => (
            <div
              key={n.id}
              className={cn(
                "p-4 rounded-xl border transition-colors",
                n.read
                  ? "bg-titan-surface border-titan-border opacity-70"
                  : "bg-titan-surface border-titan-accent/30"
              )}
            >
              <div className="flex items-start gap-3">
                <Bell className={cn("w-4 h-4 mt-0.5", n.read ? "text-zinc-600" : "text-titan-accent")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{n.title}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0", priorityColor(n.priority))}>
                      {n.priority}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">{n.body}</p>
                  <p className="text-xs text-zinc-600 mt-1">{formatDate(n.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
