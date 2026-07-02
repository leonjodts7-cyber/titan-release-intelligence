import { Suspense } from "react";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases, sortByOpportunity } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { MarketClient } from "@/app/dashboard/market/market-client";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const releases = sortByOpportunity(enrichReleases(await getReleases())).filter(
    (r) => r.current_market_price || r.estimated_resale_mid
  );

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 space-y-3 max-w-[1600px]">
        <Suspense>
          <MarketClient releases={releases} />
        </Suspense>
      </div>
    </IntelligenceLayout>
  );
}
