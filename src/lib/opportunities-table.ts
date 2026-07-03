import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { formatEur, toEur } from "@/lib/money";
import { t } from "@/lib/i18n";
import { formatDrop } from "@/lib/time";
import { getDropMeta } from "@/lib/drop";
import type { OpportunityAction } from "@/types";

export type OpportunitySortKey =
  | "opportunity"
  | "roi"
  | "profit"
  | "date"
  | "urgency"
  | "retail"
  | "resale"
  | "liquidity"
  | "risk"
  | "confidence";

export interface OpportunityColumnDef {
  id: string;
  label: string;
  align: "left" | "right";
  numeric: boolean;
  sortKey?: OpportunitySortKey;
  /** Altijd zichtbaar — nooit conditioneel verbergen */
  alwaysVisible: boolean;
}

export const DEFAULT_COLUMN_IDS = [
  "release",
  "category",
  "start",
  "retail",
  "resale",
  "profit",
  "action",
] as const;

export const EXTRA_COLUMN_IDS = ["rank", "roi", "liquidity", "risk", "confidence"] as const;

export const OPPORTUNITY_COLUMNS: OpportunityColumnDef[] = [
  { id: "rank", label: "#", align: "left", numeric: false, alwaysVisible: false },
  { id: "release", label: t("terms.release"), align: "left", numeric: false, alwaysVisible: true },
  { id: "category", label: t("terms.category"), align: "left", numeric: false, alwaysVisible: true },
  { id: "start", label: t("drops.colDrop"), align: "left", numeric: false, sortKey: "date", alwaysVisible: true },
  { id: "retail", label: t("terms.retail"), align: "right", numeric: true, sortKey: "retail", alwaysVisible: true },
  { id: "resale", label: t("terms.estResale"), align: "right", numeric: true, sortKey: "resale", alwaysVisible: true },
  { id: "profit", label: t("terms.netProfit"), align: "right", numeric: true, sortKey: "profit", alwaysVisible: true },
  { id: "roi", label: t("terms.netRoi"), align: "right", numeric: true, sortKey: "roi", alwaysVisible: false },
  { id: "liquidity", label: t("terms.liquidityShort"), align: "right", numeric: true, sortKey: "liquidity", alwaysVisible: false },
  { id: "risk", label: t("terms.risk"), align: "right", numeric: true, sortKey: "risk", alwaysVisible: false },
  { id: "confidence", label: t("terms.confidenceShort"), align: "right", numeric: true, sortKey: "confidence", alwaysVisible: false },
  { id: "action", label: t("terms.action"), align: "left", numeric: false, alwaysVisible: true },
];

export function getRetailEur(r: EnrichedRelease): number | null {
  if (r.retail_eur != null) return r.retail_eur;
  if (r.price_min == null) return null;
  const mid = (r.price_min + (r.price_max ?? r.price_min)) / 2;
  return toEur(mid, r.currency);
}

export interface OpportunityCellValue {
  display: string;
  muted?: boolean;
  title?: string;
  className?: string;
}

export function getOpportunityCellValue(
  columnId: string,
  release: EnrichedRelease,
  rank: number,
  hideTicketProfit: boolean
): OpportunityCellValue {
  const isTicket = release.release_type === "ticket";
  const maskProfit = isTicket && hideTicketProfit;
  const retailEur = getRetailEur(release);

  switch (columnId) {
    case "rank":
      return { display: String(rank) };
    case "release":
      return { display: release.title, title: release.title };
    case "category":
      return { display: release.release_categories?.name ?? "—" };
    case "start": {
      const meta = getDropMeta(release);
      return { display: formatDrop(meta), muted: !meta.dropTimeConfirmed };
    }
    case "retail":
      return {
        display: formatEur(retailEur),
        title: retailEur != null ? `Orig: ${release.currency} ${release.price_min}–${release.price_max}` : undefined,
      };
    case "resale":
      if (maskProfit) return { display: "—", muted: true };
      return {
        display: release.estimated_resale_mid ? formatEur(release.resale_eur_mid) : "—",
        className: "text-profit",
      };
    case "profit":
      if (maskProfit) return { display: "—", muted: true };
      return {
        display: release.net_profit_mid_eur != null ? formatEur(release.net_profit_mid_eur) : "—",
        className: "text-profit",
      };
    case "roi":
      if (maskProfit) return { display: "—", muted: true };
      return {
        display: release.net_roi_mid != null ? `${release.net_roi_mid}%` : "—",
        className: "text-titan-accent",
      };
    case "liquidity":
      return { display: String(Math.round(release.market_liquidity_score)) };
    case "risk":
      return { display: String(release.risk_score) };
    case "confidence":
      return { display: `${Math.round(release.resale_confidence_score)}%` };
    case "action":
      return { display: release.opportunity_action };
    default:
      return { display: "—" };
  }
}

export function sortOpportunityReleases(
  releases: EnrichedRelease[],
  sort: OpportunitySortKey
): EnrichedRelease[] {
  const sorted = [...releases];
  switch (sort) {
    case "roi":
      return sorted.sort((a, b) => (b.net_roi_mid ?? 0) - (a.net_roi_mid ?? 0));
    case "profit":
      return sorted.sort((a, b) => (b.net_profit_mid_eur ?? 0) - (a.net_profit_mid_eur ?? 0));
    case "date":
      return sorted.sort(
        (a, b) =>
          new Date(b.release_starts_at ?? 0).getTime() - new Date(a.release_starts_at ?? 0).getTime()
      );
    case "urgency":
      return sorted.sort((a, b) => b.action_urgency - a.action_urgency);
    case "retail":
      return sorted.sort((a, b) => (getRetailEur(b) ?? 0) - (getRetailEur(a) ?? 0));
    case "resale":
      return sorted.sort((a, b) => (b.resale_eur_mid ?? 0) - (a.resale_eur_mid ?? 0));
    case "liquidity":
      return sorted.sort((a, b) => b.market_liquidity_score - a.market_liquidity_score);
    case "risk":
      return sorted.sort((a, b) => b.risk_score - a.risk_score);
    case "confidence":
      return sorted.sort((a, b) => b.resale_confidence_score - a.resale_confidence_score);
    default:
      return sorted.sort((a, b) => b.opportunity_score - a.opportunity_score);
  }
}

import { tierShortLabel } from "@/lib/tiers";

export function tierLabel(action: OpportunityAction): string {
  return tierShortLabel(action);
}
