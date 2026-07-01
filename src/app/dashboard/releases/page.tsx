import { getReleases } from "@/lib/data/releases";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReleaseCard } from "@/components/releases/release-card";
import { ReleasesClient } from "./releases-client";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const releases = await getReleases();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-[1600px]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Releases</h1>
          <p className="text-zinc-500 text-sm mt-1">{releases.length} tracked releases</p>
        </div>
        <ReleasesClient initialReleases={releases} />
      </div>
    </DashboardLayout>
  );
}
