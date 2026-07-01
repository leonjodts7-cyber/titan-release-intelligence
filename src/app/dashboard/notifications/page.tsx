import { getNotifications } from "@/lib/data/notifications";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-2xl">
        <h1 className="text-lg font-bold mb-1">Notifications</h1>
        <p className="text-[10px] text-zinc-500 mb-4">Intelligence alerts · watchlist matches · threshold triggers</p>
        <NotificationsClient initial={notifications} />
      </div>
    </IntelligenceLayout>
  );
}
