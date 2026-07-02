import { getReleases } from "@/lib/data/releases";
import { enrichReleases, sortByOpportunity } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { MarketCard } from "@/components/market/market-card";
import { PageTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const releases = sortByOpportunity(enrichReleases(await getReleases())).filter(
    (r) => r.current_market_price || r.estimated_resale_mid
  );

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 space-y-3 max-w-[1600px]">
        <PageTitle
          title={t("market.title")}
          subtitle={t("market.subtitle", { count: releases.length })}
        />

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {releases.slice(0, 18).map((r) => (
            <MarketCard key={r.id} release={r} />
          ))}
        </div>
      </div>
    </IntelligenceLayout>
  );
}
