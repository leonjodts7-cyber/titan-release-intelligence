import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases, sortByOpportunity } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { MiniChart } from "@/components/intelligence/mini-chart";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { formatPrice } from "@/lib/utils";
import { OpportunityBadge } from "@/components/releases/opportunity-badge";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const releases = sortByOpportunity(enrichReleases(await getReleases()))
    .filter((r) => r.current_market_price || r.estimated_resale_mid);

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 space-y-3 max-w-[1600px]">
        <div>
          <h1 className="text-lg font-bold">Market Intelligence</h1>
          <p className="text-[10px] text-zinc-500">{releases.length} instruments · price history · liquidity · volatility</p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {releases.slice(0, 18).map((r) => (
            <Link key={r.id} href={`/dashboard/releases/${r.id}`} className="intel-card hover:border-zinc-600 transition-colors block">
              <div className="flex justify-between gap-2 mb-2">
                <span className="text-xs font-medium truncate">{r.title}</span>
                <OpportunityBadge action={r.opportunity_action} score={r.opportunity_score} compact />
              </div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                <IntelStat label="Retail" value={formatPrice(r.price_min, r.price_max, r.currency)} compact />
                <IntelStat label="Market" value={r.current_market_price ?? "—"} compact />
                <IntelStat label="Low Ask" value={r.lowest_ask ?? "—"} compact />
                <IntelStat label="High Bid" value={r.highest_bid ?? "—"} compact />
              </div>
              <MiniChart data={r.price_history_90d} height={40} positive={r.price_direction === "UP"} />
              <div className="grid grid-cols-4 gap-1 mt-2">
                <IntelStat label="Liq." value={`${Math.round(r.market_liquidity_score)}%`} compact />
                <IntelStat label="Vol." value={r.volatility_score} compact />
                <IntelStat label="Hist ROI" value={`${r.historical_roi_pct}%`} trend="up" compact />
                <IntelStat label="Direction" value={r.price_direction} compact />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </IntelligenceLayout>
  );
}
