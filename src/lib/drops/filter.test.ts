import { describe, it, expect } from "vitest";
import { filterReleasesByTime, isUpcomingRelease } from "@/lib/drops/filter";
import type { Release } from "@/types";

function mockRelease(dropAt: string, status: Release["status"] = "announced"): Release {
  return {
    id: "1",
    title: "Test",
    slug: "test",
    category_id: null,
    brand_id: null,
    artist_id: null,
    league_id: null,
    team_home_id: null,
    team_away_id: null,
    venue_id: null,
    country_id: null,
    city_id: null,
    release_type: "product",
    status,
    official_url: null,
    source_url: null,
    image_url: null,
    description: null,
    announced_at: null,
    presale_starts_at: null,
    general_sale_starts_at: null,
    release_starts_at: dropAt,
    release_ends_at: null,
    timezone: "Europe/Brussels",
    drop_at: dropAt,
    drop_time_confirmed: true,
    price_min: 100,
    price_max: 100,
    currency: "EUR",
    stock_estimate: null,
    capacity_estimate: null,
    hype_score: 50,
    demand_score: 50,
    urgency_score: 50,
    sellout_probability: 50,
    resale_interest_score: 50,
    confidence_score: 50,
    priority_level: "MEDIUM",
    last_checked_at: null,
    last_changed_at: null,
    source_adapter_id: null,
    external_id: null,
    created_at: "",
    updated_at: "",
  };
}

describe("drops/filter", () => {
  const now = new Date("2026-07-02T12:00:00.000Z");

  it("hides yesterday's drop by default", () => {
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();
    const releases = [mockRelease(yesterday), mockRelease(tomorrow)];
    const filtered = filterReleasesByTime(releases, { now });
    expect(filtered).toHaveLength(1);
    expect(isUpcomingRelease(filtered[0], now)).toBe(true);
  });

  it("shows past when includePast is true", () => {
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    const filtered = filterReleasesByTime([mockRelease(yesterday)], { now, includePast: true });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe("ended");
  });
});
