import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { filterUpcoming } from "@/lib/drops/period-filters";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CategoryHubClient } from "@/components/hubs/category-hub-client";

export const dynamic = "force-dynamic";

export default async function SchoenenPage() {
  const releases = filterUpcoming(enrichReleases(await getReleases({ sort: "date" })));
  return (
    <DashboardLayout>
      <div className="p-6 max-w-[1600px]">
        <CategoryHubClient main="schoenen" releases={releases} />
      </div>
    </DashboardLayout>
  );
}
