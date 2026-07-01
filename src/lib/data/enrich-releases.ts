import type { Release } from "@/types";
import { resaleIntelligenceService } from "@/services/resale-intelligence.service";
import type { ResaleIntelligence } from "@/services/resale-intelligence.service";
import { intelligenceEnrichmentService, type IntelligenceProfile } from "@/services/intelligence-enrichment.service";
import { opportunityEngineService, type OpportunityEngineResult } from "@/services/opportunity-engine.service";

export type EnrichedRelease = Release & ResaleIntelligence & IntelligenceProfile & OpportunityEngineResult;

export function enrichRelease(release: Release): EnrichedRelease {
  const resale = resaleIntelligenceService.analyze(release);
  const intel = intelligenceEnrichmentService.enrich(release, resale);
  const opportunity = opportunityEngineService.score(release, resale, intel);
  return { ...release, ...resale, ...intel, ...opportunity };
}

export function enrichReleases(releases: Release[]): EnrichedRelease[] {
  return releases.map(enrichRelease);
}

export function sortByOpportunity(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort((a, b) => b.opportunity_score - a.opportunity_score);
}

export function sortByResaleOpportunity(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort((a, b) => (b.expected_profit_mid ?? 0) - (a.expected_profit_mid ?? 0));
}

export function sortByRoi(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort((a, b) => (b.expected_roi_mid ?? 0) - (a.expected_roi_mid ?? 0));
}

export function getTopResaleOpportunities(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByResaleOpportunity(releases).filter((r) => (r.expected_profit_mid ?? 0) > 0).slice(0, limit);
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
  return releases.reduce((sum, r) => sum + (r.expected_profit_mid ?? 0), 0);
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
  if (filters.minRoi != null) result = result.filter((r) => (r.expected_roi_mid ?? 0) >= filters.minRoi!);
  if (filters.minProfit != null) result = result.filter((r) => (r.expected_profit_mid ?? 0) >= filters.minProfit!);
  if (filters.maxRisk != null) result = result.filter((r) => r.risk_score <= filters.maxRisk!);
  if (filters.minConfidence != null) result = result.filter((r) => r.resale_confidence_score >= filters.minConfidence!);
  if (filters.country) result = result.filter((r) => r.countries?.code === filters.country);

  switch (filters.sort) {
    case "roi": return sortByRoi(result);
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

/** Global search across all indexed fields */
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
