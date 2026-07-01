import { describe, expect, it } from "vitest";
import { assignOpportunityTiers, assignTierByRank, computeOpportunityScoreV2 } from "@/lib/scoring-v2";
import { generateMockReleases } from "@/lib/data/mock-releases";
import { enrichReleases } from "@/lib/data/enrich-releases";

describe("scoring-v2", () => {
  it("assigns tier percentiles by count", () => {
    expect(assignTierByRank(0, 100)).toBe("TOP OPPORTUNITY");
    expect(assignTierByRank(4, 100)).toBe("TOP OPPORTUNITY");
    expect(assignTierByRank(5, 100)).toBe("MUST WATCH");
    expect(assignTierByRank(99, 100)).toBe("IGNORE");
  });

  it("limits TOP to ~5% of mock releases", () => {
    const enriched = enrichReleases(generateMockReleases());
    const top = enriched.filter((r) => r.opportunity_action === "TOP OPPORTUNITY");
    expect(top.length).toBeLessThanOrEqual(Math.ceil(enriched.length * 0.05) + 1);
    expect(top.length).toBeGreaterThan(0);
  });

  it("produces varied opportunity scores", () => {
    const enriched = enrichReleases(generateMockReleases());
    const scores = new Set(enriched.map((r) => r.opportunity_score));
    expect(scores.size).toBeGreaterThan(10);
  });

  it("computes weighted opportunity score", () => {
    const score = computeOpportunityScoreV2({
      demand: 80,
      netMarginScore: 60,
      scarcity: 70,
      liquidity: 50,
      momentum: 40,
    });
    expect(score).toBe(Math.round(0.3 * 80 + 0.25 * 60 + 0.2 * 70 + 0.15 * 50 + 0.1 * 40));
  });

  it("assignOpportunityTiers preserves count and ranks", () => {
    const items = assignOpportunityTiers([
      { id: "1", opportunity_score: 90, opportunity_action: "WATCH" as const },
      { id: "2", opportunity_score: 80, opportunity_action: "WATCH" as const },
      { id: "3", opportunity_score: 70, opportunity_action: "WATCH" as const },
    ]);
    expect(items).toHaveLength(3);
    expect(items.find((i) => i.id === "1")?.opportunity_action).toBe("TOP OPPORTUNITY");
  });
});
