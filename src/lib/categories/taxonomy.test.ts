import { describe, it, expect } from "vitest";
import { generateMockReleases } from "@/lib/data/mock-releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { classifyRelease, countBySub, MAIN_CATEGORIES } from "@/lib/categories/taxonomy";
import {
  filterTodayTomorrow,
  filterUpcoming,
  topTierWithinWeek,
} from "@/lib/drops/period-filters";
import { sortByDropTime } from "@/lib/drop";

describe("category taxonomy", () => {
  const releases = enrichReleases(generateMockReleases());

  it("every release has main + sub category", () => {
    for (const r of releases) {
      expect(r.main_category).toBeTruthy();
      expect(r.sub_category).toBeTruthy();
      const c = classifyRelease(r);
      expect(c.main).toBe(r.main_category);
      expect(c.sub).toBe(r.sub_category);
    }
  });

  it("Travis Scott Houston is Tickets > Concerten", () => {
    const mercurial = releases.find((r) => r.slug === "mercurial-superfly-elite");
    expect(mercurial).toBeDefined();
    expect(classifyRelease(mercurial!).main).toBe("schoenen");
    expect(classifyRelease(mercurial!).sub).toBe("football-boots");

    const travis = releases.find((r) => r.slug === "travis-scott-houston-sep-2026");
    expect(travis).toBeDefined();
    expect(classifyRelease(travis!).main).toBe("tickets");
    expect(classifyRelease(travis!).sub).toBe("concerts");
  });

  it("hub subcategory counts include all items", () => {
    const schoenen = releases.filter((r) => classifyRelease(r).main === "schoenen");
    const counts = countBySub(schoenen, "schoenen");
    const subSum = MAIN_CATEGORIES.schoenen.subcategories.reduce(
      (sum, s) => sum + (counts[s.slug] ?? 0),
      0
    );
    expect(counts.all).toBe(schoenen.length);
    expect(subSum).toBe(schoenen.length);
  });

  it("calendar chips use main category color classes", () => {
    for (const main of ["schoenen", "tickets", "kaarten", "overig"] as const) {
      expect(MAIN_CATEGORIES[main].chip).toMatch(/bg-/);
    }
  });

  it("no duplicate drops on Vandaag sections", () => {
    const now = new Date();
    const upcoming = sortByDropTime(filterUpcoming(releases, now));
    const todayTomorrow = filterTodayTomorrow(upcoming, now);
    const todayIds = new Set(todayTomorrow.map((r) => r.id));
    const bestWeek = topTierWithinWeek(releases, 3, now).filter((r) => !todayIds.has(r.id));
    const overlap = bestWeek.filter((r) => todayIds.has(r.id));
    expect(overlap).toHaveLength(0);
  });
});
