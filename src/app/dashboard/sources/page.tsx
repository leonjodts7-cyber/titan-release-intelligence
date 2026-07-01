import { getSourceAdapters } from "@/lib/data/sources";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SourcesClient } from "./sources-client";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await getSourceAdapters();
  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage source adapters and scan frequency</p>
        </div>
        <SourcesClient initialSources={sources} />
      </div>
    </DashboardLayout>
  );
}
