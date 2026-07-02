"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { Notification } from "@/types";
import type { AlertRule, AlertEvent } from "@/services/alert-rules.service";
import { NotificationsClient } from "@/app/dashboard/notifications/notifications-client";
import { AlertsClient } from "@/app/dashboard/alerts/alerts-client";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function MeldingenTabs({
  notifications,
  rules,
  events,
}: {
  notifications: Notification[];
  rules: AlertRule[];
  events: AlertEvent[];
}) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "waarschuwingen" ? "alerts" : "notifications";

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-titan-border p-0.5 w-fit text-xs">
        <a
          href="/dashboard/meldingen"
          className={cn(
            "px-3 py-1.5 rounded-md",
            tab === "notifications" ? "bg-titan-accent/15 text-titan-accent" : "text-titan-muted"
          )}
        >
          {t("meldingen.tabNotifications")}
        </a>
        <a
          href="/dashboard/meldingen?tab=waarschuwingen"
          className={cn(
            "px-3 py-1.5 rounded-md",
            tab === "alerts" ? "bg-titan-accent/15 text-titan-accent" : "text-titan-muted"
          )}
        >
          {t("meldingen.tabAlerts")}
        </a>
      </div>
      {tab === "notifications" ? (
        <NotificationsClient initial={notifications} />
      ) : (
        <AlertsClient initialRules={rules} initialEvents={events} />
      )}
    </div>
  );
}

export function MeldingenClient({
  notifications,
  rules,
  events,
}: {
  notifications: Notification[];
  rules: AlertRule[];
  events: AlertEvent[];
}) {
  return (
    <Suspense>
      <MeldingenTabs notifications={notifications} rules={rules} events={events} />
    </Suspense>
  );
}
