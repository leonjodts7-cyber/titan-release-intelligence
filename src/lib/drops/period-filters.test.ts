import { describe, expect, it } from "vitest";
import { topTierWithinWeek, filterThisWeek } from "@/lib/drops/period-filters";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";

function r(partial: Partial<EnrichedRelease> & { id: string }): EnrichedRelease {
  return {
    title: "T",
    slug: "t",
    opportunity_score: 95,
    opportunity_action: "TOP OPPORTUNITY",
    ...partial,
  } as EnrichedRelease;
}

describe("period-filters", () => {
  const now = new Date("2026-07-03T12:00:00Z");

  it("best week only includes drops within 7 days", () => {
    const week = r({ id: "1", drop_at: new Date(now.getTime() + 2 * 86400000).toISOString() });
    const later = r({ id: "2", drop_at: new Date(now.getTime() + 20 * 86400000).toISOString() });
    const picks = topTierWithinWeek([week, later], 5, now);
    expect(picks.map((x) => x.id)).toEqual(["1"]);
  });

  it("filterThisWeek respects window", () => {
    const inside = r({ id: "a", drop_at: new Date(now.getTime() + 5 * 86400000).toISOString() });
    const outside = r({ id: "b", drop_at: new Date(now.getTime() + 9 * 86400000).toISOString() });
    expect(filterThisWeek([inside, outside], now).map((x) => x.id)).toEqual(["a"]);
  });
});
