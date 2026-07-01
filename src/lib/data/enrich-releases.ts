import type { Release } from "@/types";
import { resaleIntelligenceService } from "@/services/resale-intelligence.service";
import type { ResaleIntelligence } from "@/services/resale-intelligence.service";
import { opportunityScoringService, type OpportunityScore } from "@/services/opportunity-scoring.service";

export type EnrichedRelease = Release & ResaleIntelligence & OpportunityScore;

export function enrichRelease(release: Release): EnrichedRelease {
  const resale = resaleIntelligenceService.analyze(release);
  const opportunity = opportunityScoringService.score(release, resale);
  return { ...release, ...resale, ...opportunity };
}

export function enrichReleases(releases: Release[]): EnrichedRelease[] {
  return releases.map(enrichRelease);
}

export function sortByOpportunity(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort((a, b) => b.opportunity_score - a.opportunity_score);
}

export function sortByResaleOpportunity(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort(
    (a, b) => (b.expected_profit_mid ?? 0) - (a.expected_profit_mid ?? 0)
  );
}

export function sortByRoi(releases: EnrichedRelease[]): EnrichedRelease[] {
  return [...releases].sort(
    (a, b) => (b.expected_roi_mid ?? 0) - (a.expected_roi_mid ?? 0)
  );
}

export function getTopResaleOpportunities(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByResaleOpportunity(releases)
    .filter((r) => (r.expected_profit_mid ?? 0) > 0)
    .slice(0, limit);
}

export function getMustWatch(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByOpportunity(releases)
    .filter((r) => r.opportunity_action === "MUST WATCH" || r.opportunity_action === "PRIORITY")
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
      r.release_categories?.slug === "nike-football-boots" ||
      r.brands?.name === "Nike" || r.brands?.name === "Jordan" || r.brands?.name === "Adidas"
    )
    .slice(0, limit);
}

export function getTicketOpportunities(releases: EnrichedRelease[], limit = 6): EnrichedRelease[] {
  return sortByOpportunity(releases)
    .filter((r) => r.release_type === "ticket")
    .slice(0, limit);
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
    result = result.filter((r) => r.title.toLowerCase().includes(q));
  }
  if (filters.category) {
    result = result.filter((r) => r.release_categories?.slug === filters.category);
  }
  if (filters.priority) {
    result = result.filter((r) => r.priority_level === filters.priority);
  }
  if (filters.action) {
    result = result.filter((r) => r.opportunity_action === filters.action);
  }
  if (filters.minRoi != null) {
    result = result.filter((r) => (r.expected_roi_mid ?? 0) >= filters.minRoi!);
  }
  if (filters.minProfit != null) {
    result = result.filter((r) => (r.expected_profit_mid ?? 0) >= filters.minProfit!);
  }
  if (filters.maxRisk != null) {
    result = result.filter((r) => r.risk_score <= filters.maxRisk!);
  }
  if (filters.minConfidence != null) {
    result = result.filter((r) => r.resale_confidence_score >= filters.minConfidence!);
  }
  if (filters.country) {
    result = result.filter((r) => r.countries?.code === filters.country);
  }

  switch (filters.sort) {
    case "roi": return sortByRoi(result);
    case "profit": return sortByResaleOpportunity(result);
    case "date":
      return result.sort((a, b) => {
        const da = a.release_starts_at ? new Date(a.release_starts_at).getTime() : Infinity;
        const db = b.release_starts_at ? new Date(b.release_starts_at).getTime() : Infinity;
        return da - db;
      });
    case "urgency":
      return result.sort((a, b) => b.action_urgency - a.action_urgency);
    default:
      return sortByOpportunity(result);
  }
}
