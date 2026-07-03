import { describe, expect, it } from "vitest";
import { generateMockReleases } from "@/lib/data/mock-releases";
import { filterVerifiedReleases, isVerifiedRelease } from "@/lib/data/origin";
import { validateCuratedRows } from "@/lib/categories/validate-data";
import { curatedRowToRelease } from "@/lib/sources/curated";

describe("data origin", () => {
  it("mock releases are not verified", () => {
    const mock = generateMockReleases().map((r) => ({ ...r, data_origin: "mock" as const }));
    expect(mock.every((r) => !isVerifiedRelease(r))).toBe(true);
    expect(filterVerifiedReleases(mock)).toHaveLength(0);
  });

  it("api and curated releases pass verification filter", () => {
    const api = { ...generateMockReleases()[0], data_origin: "api" as const };
    const curated = curatedRowToRelease({
      name: "Test drop",
      main_category: "tickets",
      sub_category: "football",
      timezone: "Europe/Brussels",
      confirmed: true,
      currency: "EUR",
      buy_locations: [],
      source_url: "https://www.fifa.com/en/tournaments",
      added_at: "2026-07-03",
    });
    const verified = filterVerifiedReleases([
      { ...api, id: "1" },
      { ...curated, id: "2" } as never,
    ]);
    expect(verified).toHaveLength(2);
  });
});

describe("validateCuratedRows", () => {
  it("rejects entry without source_url", () => {
    const issues = validateCuratedRows([
      {
        name: "Bad drop",
        main_category: "schoenen",
        sub_category: "limited-sneakers",
        timezone: "Europe/Brussels",
        confirmed: false,
        currency: "EUR",
        buy_locations: [],
        source_url: "",
        added_at: "2026-07-03",
      },
    ]);
    expect(issues.some((i) => i.code === "curated_missing_source_url")).toBe(true);
  });

  it("skips placeholder entries", () => {
    const issues = validateCuratedRows([
      {
        placeholder: true,
        name: "PLACEHOLDER",
        main_category: "schoenen",
        sub_category: "limited-sneakers",
        timezone: "Europe/Brussels",
        confirmed: false,
        currency: "EUR",
        buy_locations: [],
        source_url: "",
        added_at: "2026-01-01",
      },
    ]);
    expect(issues).toHaveLength(0);
  });
});
