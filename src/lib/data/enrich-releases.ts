import type { Release } from "@/types";
import type { OpportunityAction } from "@/types";
import { resaleIntelligenceService } from "@/services/resale-intelligence.service";
import type { ResaleIntelligence } from "@/services/resale-intelligence.service";
import { intelligenceEnrichmentService, type IntelligenceProfile } from "@/services/intelligence-enrichment.service";
import { opportunityEngineService, type OpportunityEngineResult } from "@/services/opportunity-engine.service";
import { assignOpportunityTiers } from "@/lib/scoring-v2";
import { withCategoryFields } from "@/lib/categories/taxonomy";
import { isVerifiedRelease } from "@/lib/data/origin";
import { getDropAt } from "@/lib/drop";

export type EnrichedRelease = Release &
  ResaleIntelligence &
  IntelligenceProfile &
  OpportunityEngineResult;

function honestEnrich(release: Release): EnrichedRelease {
  const categorized = withCategoryFields(release);
  const isTicket = categorized.release_type === "ticket";
  const dropAt = getDropAt(categorized);
  const daysUntil = dropAt
    ? (new Date(dropAt).getTime() - Date.now()) / 86400000
    : null;

  let action: OpportunityAction = "WATCH";
  if (categorized.status === "on_sale") action = "WATCH";
  else if (daysUntil != null && daysUntil <= 2) action = "HIGH PRIORITY";
  else if (daysUntil != null && daysUntil <= 7) action = "PREPARE";

  return {
    ...categorized,
    retail_price_min: categorized.price_min ?? null,
    retail_price_max: categorized.price_max ?? null,
    retail_currency: categorized.currency ?? "EUR",
    retail_eur: categorized.price_min ?? null,
    resale_eur_mid: null,
    estimated_resale_low: null,
    estimated_resale_mid: null,
    estimated_resale_high: null,
    expected_profit_low: null,
    expected_profit_mid: null,
    expected_profit_high: null,
    expected_roi_low: null,
    expected_roi_mid: null,
    expected_roi_high: null,
    net_profit_mid_eur: null,
    net_roi_mid: null,
    gross_roi_mid: null,
    resale_platform: "",
    net_margin_score: 0,
    resale_confidence_score: 0,
    market_liquidity_score: 0,
    demand_pressure_score: isTicket ? Math.min(80, categorized.capacity_estimate ? 60 : 40) : 0,
    resale_risk_level: "LOW",
    resale_explanation: isTicket
      ? "Alleen officiële ticketdata — geen resale- of winstinschatting."
      : "Gecureerde of API-bron — geen verzonnen resale-metrics.",
    is_estimated: false,
    hype_score: 0,
    demand_score: 0,
    urgency_score: daysUntil != null && daysUntil <= 3 ? 70 : 30,
    sellout_probability: 0,
    resale_interest_score: 0,
    confidence_score: categorized.drop_time_confirmed ? 90 : 60,
    opportunity_score: daysUntil != null && daysUntil <= 7 ? 65 : 40,
    scarcity_score: 0,
    resale_potential: 0,
    risk_score: 0,
    action_urgency: daysUntil != null && daysUntil <= 1 ? 90 : 40,
    opportunity_action: action,
    popularity_score: 0,
    momentum_score: 0,
    volatility_score: 0,
    hype_reason: categorized.hype_reason ?? null,
  } as EnrichedRelease;
}

function enrichReleaseCore(release: Release): EnrichedRelease {
  const categorized = withCategoryFields(release);
  if (isVerifiedRelease(categorized)) {
    return honestEnrich(categorized);
  }
  const resale = resaleIntelligenceService.analyze(categorized);
  const intel = intelligenceEnrichmentService.enrich(categorized, resale);
  const opportunity = opportunityEngineService.score(categorized, resale, intel);
  return { ...categorized, ...resale, ...intel, ...opportunity };
}

export function enrichRelease(release: Release): EnrichedRelease {
  const enriched = enrichReleaseCore(release);
  if (isVerifiedRelease(release)) return enriched;
  return assignOpportunityTiers([enriched])[0];
}

export function enrichReleases(releases: Release[]): EnrichedRelease[] {
  const enriched = releases.map(enrichReleaseCore);
  const verified = enriched.filter(isVerifiedRelease);
  const mock = enriched.filter((r) => !isVerifiedRelease(r));
  return [...verified, ...assignOpportunityTiers(mock)];
}

export function sortByOpportunity(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort((a, b) => b.opportunity_score - a.opportunity_score);
}

export function sortByResaleOpportunity(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort(
    (a, b) => (b.net_profit_mid_eur ?? b.expected_profit_mid ?? 0) - (a.net_profit_mid_eur ?? a.expected_profit_mid ?? 0)
  );
}

export function sortByRoi(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort((a, b) => (b.gross_roi_mid ?? b.expected_roi_mid ?? 0) - (a.gross_roi_mid ?? a.expected_roi_mid ?? 0));
}

export function sortByNetRoi(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort((a, b) => (b.net_roi_mid ?? 0) - (a.net_roi_mid ?? 0));
}

function takeUnique(releases: EnrichedRelease[], limit: number, used: Set<string>): EnrichedRelease[] {
  const out: EnrichedRelease[] = [];
  for (const r of releases) {
    if (used.has(r.id)) continue;
    out.push(r);
    used.add(r.id);
    if (out.length >= limit) break;
  }
  return out;
}

export function getDashboardSections(releases: EnrichedRelease[], limit = 5) {
  const used = new Set<string>();
  const mustWatch = takeUnique(
    sortByOpportunity(releases).filter((r) =>
      r.opportunity_action === "TOP OPPORTUNITY" ||
      r.opportunity_action === "MUST WATCH" ||
      r.opportunity_action === "HIGH PRIORITY"
    ),
    limit,
    used
  );
  const bestResale = takeUnique(
    sortByResaleOpportunity(releases).filter((r) => (r.net_profit_mid_eur ?? r.expected_profit_mid ?? 0) > 0),
    limit,
    used
  );
  const highestRoi = takeUnique(sortByNetRoi(releases).filter((r) => (r.net_roi_mid ?? 0) > 0), limit, used);
  return { mustWatch, bestResale, highestRoi, usedIds: used };
}

export function getTopResaleOpportunities(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByResaleOpportunity(releases)
    .filter((r) => (r.net_profit_mid_eur ?? r.expected_profit_mid ?? 0) > 0)
    .slice(0, limit);
}

export function getMustWatch(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByOpportunity(releases)
    .filter((r) =>
      r.opportunity_action === "MUST WATCH" ||
      r.opportunity_action === "TOP OPPORTUNITY" ||
      r.opportunity_action === "HIGH PRIORITY"
    )
    .slice(0, limit);
}

export function getTcgOpportunities(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByOpportunity(releases)
    .filter((r) => r.tcg_name || r.release_categories?.slug === "tcg-collectibles")
    .slice(0, limit);
}

export function getSneakerDrops(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByOpportunity(releases)
    .filter((r) =>
      r.release_categories?.slug === "limited-sneakers" ||
      r.brands?.name === "Nike" || r.brands?.name === "Jordan" || r.brands?.name === "Adidas"
    )
    .slice(0, limit);
}

export function getTicketOpportunities(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByOpportunity(releases).filter((r) => r.release_type === "ticket").slice(0, limit);
}

export function getTotalProfitOpportunity(releases: EnrichedRelease[]): number {
  const seen = new Set<string>();
  return releases.reduce((sum, r) => {
    if (seen.has(r.id)) return sum;
    seen.add(r.id);
    return sum + (r.net_profit_mid_eur ?? r.expected_profit_mid ?? 0);
  }, 0);
}

export function filterOpportunities(
  releases: EnrichedRelease[],
  filters: import("@/types").OpportunityFilters
): EnrichedRelease[] {
  let result = [...releases];
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.artists?.name?.toLowerCase().includes(q) ||
      r.brands?.name?.toLowerCase().includes(q) ||
      r.tcg_name?.toLowerCase().includes(q)
    );
  }
  if (filters.category) result = result.filter((r) => r.release_categories?.slug === filters.category);
  if (filters.priority) result = result.filter((r) => r.priority_level === filters.priority);
  if (filters.action) result = result.filter((r) => r.opportunity_action === filters.action);
  if (filters.minRoi != null) result = result.filter((r) => (r.net_roi_mid ?? r.expected_roi_mid ?? 0) >= filters.minRoi!);
  if (filters.minProfit != null) result = result.filter((r) => (r.net_profit_mid_eur ?? r.expected_profit_mid ?? 0) >= filters.minProfit!);
  if (filters.maxRisk != null) result = result.filter((r) => r.risk_score <= filters.maxRisk!);
  if (filters.minConfidence != null) result = result.filter((r) => r.resale_confidence_score >= filters.minConfidence!);
  if (filters.country) result = result.filter((r) => r.countries?.code === filters.country);

  switch (filters.sort) {
    case "roi": return sortByNetRoi(result);
    case "profit": return sortByResaleOpportunity(result);
    case "date":
      return result.sort((a, b) => {
        const da = a.release_starts_at ? new Date(a.release_starts_at).getTime() : Infinity;
        const db = b.release_starts_at ? new Date(b.release_starts_at).getTime() : Infinity;
        return da - db;
      });
    case "urgency": return result.sort((a, b) => b.action_urgency - a.action_urgency);
    default: return sortByOpportunity(result);
  }
}

export function globalSearch(releases: EnrichedRelease[], query: string, limit = 30): EnrichedRelease[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return releases.filter((r) => {
    const haystack = [
      r.title, r.artists?.name, r.brands?.name, r.tcg_name, r.set_name,
      r.cities?.name, r.countries?.name, r.sports_leagues?.name,
      r.release_categories?.name, r.venues?.name,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q) || q.split(" ").every((w) => haystack.includes(w));
  }).slice(0, limit);
}
