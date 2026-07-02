import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import type { OpportunityAction } from "@/types";

const HIGH_TIERS: OpportunityAction[] = [
  "TOP OPPORTUNITY",
  "MUST WATCH",
  "HIGH PRIORITY",
];

const CRITICAL_TIERS: OpportunityAction[] = ["TOP OPPORTUNITY", "MUST WATCH"];

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
    : Math.round(sorted[mid] * 10) / 10;
}

export interface DashboardMetrics {
  profitPool: number;
  avgNetRoi: number;
  topRoi: number;
  criticalCount: number;
  opportunityCount: number;
}

/** Enige bron voor dashboard-aggregaties. */
export function computeDashboardMetrics(releases: EnrichedRelease[]): DashboardMetrics {
  const nonTickets = releases.filter((r) => r.release_type !== "ticket");
  const highTier = nonTickets.filter((r) => HIGH_TIERS.includes(r.opportunity_action));

  const profitPool = Math.round(
    highTier.reduce((sum, r) => sum + (r.net_profit_mid_eur ?? 0), 0)
  );

  const roiValues = nonTickets
    .map((r) => r.net_roi_mid)
    .filter((v): v is number => v != null && !Number.isNaN(v));

  const topRoi = roiValues.length ? Math.max(...roiValues) : 0;

  return {
    profitPool,
    avgNetRoi: median(roiValues),
    topRoi: Math.round(topRoi * 10) / 10,
    criticalCount: releases.filter((r) => CRITICAL_TIERS.includes(r.opportunity_action)).length,
    opportunityCount: releases.filter((r) => r.opportunity_action !== "IGNORE").length,
  };
}

/** Som netto winst voor zichtbare kansen-rijen (voor tests). */
export function sumVisibleProfitRows(rows: EnrichedRelease[]): number {
  return Math.round(
    rows
      .filter((r) => r.release_type !== "ticket" && HIGH_TIERS.includes(r.opportunity_action))
      .reduce((s, r) => s + (r.net_profit_mid_eur ?? 0), 0)
  );
}
