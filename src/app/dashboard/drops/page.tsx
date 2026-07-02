import { Suspense } from "react";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { DropsClient } from "@/app/dashboard/drops/drops-client";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DropsPage({
  searchParams,
}: {
  searchParams: Promise<{ showPast?: string }>;
}) {
  const { showPast } = await searchParams;
  const includePast = showPast === "1";
  const raw = await getReleases({ includePast });
  const releases = enrichReleases(raw);

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-[1600px]">
        <header className="mb-4">
          <h1 className="text-lg font-semibold">{t("drops.title")}</h1>
          <p className="text-xs text-titan-muted">{t("drops.subtitle", { count: releases.length })}</p>
        </header>
        <Suspense>
          <DropsClient initialReleases={releases} includePast={includePast} />
        </Suspense>
      </div>
    </IntelligenceLayout>
  );
}
