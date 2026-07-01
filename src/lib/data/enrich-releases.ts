import type { Release } from "@/types";
import { resaleIntelligenceService } from "@/services/resale-intelligence.service";
import type { ResaleIntelligence } from "@/services/resale-intelligence.service";

export type EnrichedRelease = Release & ResaleIntelligence;

export function enrichRelease(release: Release): EnrichedRelease {
  const resale = resaleIntelligenceService.analyze(release);
  return { ...release, ...resale };
}

export function enrichReleases(releases: Release[]): EnrichedRelease[] {
  return releases.map(enrichRelease);
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

export function getTotalProfitOpportunity(releases: EnrichedRelease[]): number {
  return releases.reduce((sum, r) => sum + (r.expected_profit_mid ?? 0), 0);
}
