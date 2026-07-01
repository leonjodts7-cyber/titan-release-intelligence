import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReleasesClient } from "./releases-client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const releases = enrichReleases(await getReleases());

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-[1800px]">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold">Releases</h1>
          <p className="text-zinc-500 text-xs mt-0.5">{releases.length} tracked · retail & resale intelligence</p>
        </div>
        <Suspense fallback={<div className="text-zinc-500 text-sm">Loading...</div>}>
          <ReleasesClient initialReleases={releases} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
