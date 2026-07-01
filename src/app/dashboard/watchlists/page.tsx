import { getWatchlists } from "@/lib/data/notifications";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WatchlistsClient } from "./watchlists-client";

export const dynamic = "force-dynamic";

export default async function WatchlistsPage() {
  const watchlists = await getWatchlists();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Watchlists</h1>
          <p className="text-zinc-500 text-sm mt-1">{watchlists.length} active watchlists with automated matching</p>
        </div>
        <WatchlistsClient initialWatchlists={watchlists} />
      </div>
    </DashboardLayout>
  );
}
