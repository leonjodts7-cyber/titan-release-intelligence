"use client";

import { useState } from "react";
import Link from "next/link";
import { MiniChart, CHART_PERIODS } from "@/components/intelligence/mini-chart";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { OpportunityBadge } from "@/components/releases/opportunity-badge";
import { formatEur, toEur } from "@/lib/money";
import { slicePriceHistory } from "@/lib/price-history";
import { t } from "@/lib/i18n";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";

export function MarketCard({ release: r }: { release: EnrichedRelease }) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const history =
    period === 7
      ? slicePriceHistory(r.price_history_30d, 7)
      : period === 30
        ? r.price_history_30d
        : r.price_history_90d;

  const retailEur =
    r.retail_eur ??
    (r.price_min != null ? toEur((r.price_min + (r.price_max ?? r.price_min)) / 2, r.currency) : null);
  const marketEur = r.resale_eur_mid ?? (r.current_market_price != null ? toEur(r.current_market_price, r.currency) : null);

  return (
    <Link href={`/dashboard/releases/${r.id}`} className="intel-card hover:border-zinc-600 transition-colors block">
      <div className="flex justify-between gap-2 mb-2">
        <span className="text-xs font-medium line-clamp-2 leading-snug" title={r.title}>
          {r.title}
        </span>
        <OpportunityBadge action={r.opportunity_action} compact showScore={false} />
      </div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        <IntelStat
          label={t("terms.retail")}
          value={formatEur(retailEur)}
          compact
          sub={r.currency !== "EUR" ? r.currency : undefined}
        />
        <IntelStat label={t("terms.market")} value={formatEur(marketEur)} compact />
        <IntelStat
          label={t("market.lowAsk")}
          value={r.lowest_ask != null ? formatEur(toEur(r.lowest_ask, r.currency)) : "—"}
          compact
        />
        <IntelStat
          label={t("market.highBid")}
          value={r.highest_bid != null ? formatEur(toEur(r.highest_bid, r.currency)) : "—"}
          compact
        />
      </div>
      <MiniChart
        data={history}
        height={40}
        positive={r.price_direction === "UP"}
        showTooltip
        periods={CHART_PERIODS}
        activePeriod={period}
        onPeriodChange={setPeriod}
      />
      <div className="grid grid-cols-4 gap-1 mt-2">
        <IntelStat label={t("terms.liquidityShort")} value={`${Math.round(r.market_liquidity_score)}%`} compact />
        <IntelStat label={t("terms.volatilityShort")} value={r.volatility_score} compact />
        <IntelStat label={t("market.histRoi")} value={`${r.historical_roi_pct}%`} trend="up" compact />
        <IntelStat label={t("terms.direction")} value={r.price_direction} compact />
      </div>
    </Link>
  );
}
