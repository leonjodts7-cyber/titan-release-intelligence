import { describe, it, expect } from "vitest";
import { generateMockReleases } from "@/lib/data/mock-releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { classifyRelease } from "@/lib/categories/taxonomy";
import { validateMockData } from "@/lib/categories/validate-data";
import {
  filterTodayTomorrow,
  filterUpcoming,
  getBestWeekSection,
} from "@/lib/drops/period-filters";
import { sortByDropTime } from "@/lib/drop";

describe("validate-data", () => {
  it("mock seed passes validation", () => {
    expect(validateMockData()).toHaveLength(0);
  });

  it("Travis Scott Houston is Tickets > Concerten", () => {
    const releases = enrichReleases(generateMockReleases());
    const travis = releases.find((r) => r.slug === "travis-scott-houston-sep-2026");
    expect(travis).toBeDefined();
    expect(classifyRelease(travis!).main).toBe("tickets");
    expect(classifyRelease(travis!).sub).toBe("concerts");
  });

  it("no concert-pattern releases in Schoenen", () => {
    const releases = enrichReleases(generateMockReleases());
    const bad = releases.filter((r) => {
      const c = classifyRelease(r);
      return c.main === "schoenen" && r.artists?.name;
    });
    expect(bad).toHaveLength(0);
  });
});

describe("week section logic", () => {
  it("reports all_above when toppers are in today/tomorrow", () => {
    const releases = enrichReleases(generateMockReleases());
    const now = new Date();
    const upcoming = sortByDropTime(filterUpcoming(releases, now));
    const todayTomorrow = filterTodayTomorrow(upcoming, now);
    const { items, emptyReason } = getBestWeekSection(releases, todayTomorrow, 3, now);
    const weekToppers = releases.filter(
      (r) =>
        (r.opportunity_action === "TOP OPPORTUNITY" || r.opportunity_action === "MUST WATCH") &&
        todayTomorrow.some((t) => t.id === r.id)
    );
    if (weekToppers.length > 0 && items.length === 0) {
      expect(emptyReason).toBe("all_above");
    }
  });
});
