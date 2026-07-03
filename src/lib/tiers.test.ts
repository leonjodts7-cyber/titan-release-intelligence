import { describe, expect, it } from "vitest";
import { groupReleasesByTier, tierShortLabel, isWithinDays } from "@/lib/tiers";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";

function mockEnriched(partial: Partial<EnrichedRelease> & { id: string; opportunity_action: EnrichedRelease["opportunity_action"] }): EnrichedRelease {
  return {
    id: partial.id,
    title: partial.title ?? "Test",
    slug: partial.slug ?? "test",
    opportunity_score: partial.opportunity_score ?? 50,
    opportunity_action: partial.opportunity_action,
    drop_at: partial.drop_at ?? new Date(Date.now() + 86400000).toISOString(),
    release_starts_at: partial.drop_at ?? new Date(Date.now() + 86400000).toISOString(),
  } as EnrichedRelease;
}

describe("tiers", () => {
  it("groups releases TOP before BASIS", () => {
    const items = [
      mockEnriched({ id: "1", opportunity_action: "IGNORE", drop_at: new Date(Date.now() + 86400000).toISOString() }),
      mockEnriched({ id: "2", opportunity_action: "TOP OPPORTUNITY", drop_at: new Date(Date.now() + 172800000).toISOString() }),
    ];
    const grouped = groupReleasesByTier(items);
    expect(grouped[0][0]).toBe("TOP");
    expect(tierShortLabel("IGNORE")).toBe("BASIS");
  });

  it("filters within 7 days", () => {
    const now = new Date("2026-07-03T12:00:00Z");
    const in3 = new Date(now.getTime() + 3 * 86400000).toISOString();
    const in10 = new Date(now.getTime() + 10 * 86400000).toISOString();
    expect(isWithinDays(in3, 7, now)).toBe(true);
    expect(isWithinDays(in10, 7, now)).toBe(false);
  });
});
