import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { OpportunitiesClient } from "./opportunities-client";
import { PageTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const releases = enrichReleases(await getReleases());

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-[1800px]">
        <PageTitle
          title={t("opportunities.title")}
          subtitle={t("opportunities.subtitle", { count: releases.length })}
        />
        <OpportunitiesClient initialReleases={releases} />
      </div>
    </IntelligenceLayout>
  );
}
