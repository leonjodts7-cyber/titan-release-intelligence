import { describe, expect, it } from "vitest";
import { generateMockReleases } from "@/lib/data/mock-releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { computeDashboardMetrics, sumVisibleProfitRows } from "@/lib/metrics";
import { OPPORTUNITY_COLUMNS } from "@/lib/opportunities-table";

describe("metrics", () => {
  it("profitPool equals sum of high-tier non-ticket rows", () => {
    const enriched = enrichReleases(generateMockReleases());
    const metrics = computeDashboardMetrics(enriched);
    const highTier = enriched.filter(
      (r) =>
        r.release_type !== "ticket" &&
        ["TOP OPPORTUNITY", "MUST WATCH", "HIGH PRIORITY"].includes(r.opportunity_action)
    );
    const expected = Math.round(highTier.reduce((s, r) => s + (r.net_profit_mid_eur ?? 0), 0));
    expect(metrics.profitPool).toBe(expected);
    expect(sumVisibleProfitRows(highTier)).toBe(expected);
  });

  it("topRoi appears in ranking", () => {
    const enriched = enrichReleases(generateMockReleases());
    const metrics = computeDashboardMetrics(enriched);
    const maxInData = Math.max(...enriched.filter((r) => r.release_type !== "ticket").map((r) => r.net_roi_mid ?? 0));
    expect(metrics.topRoi).toBe(maxInData);
    expect(enriched.some((r) => r.net_roi_mid === metrics.topRoi)).toBe(true);
  });

  it("avgNetRoi is median not thrown by outliers", () => {
    const enriched = enrichReleases(generateMockReleases());
    const metrics = computeDashboardMetrics(enriched);
    const rois = enriched
      .filter((r) => r.release_type !== "ticket" && r.net_roi_mid != null)
      .map((r) => r.net_roi_mid!)
      .sort((a, b) => a - b);
    const mid = Math.floor(rois.length / 2);
    const expected =
      rois.length % 2 === 0
        ? Math.round(((rois[mid - 1] + rois[mid]) / 2) * 10) / 10
        : Math.round(rois[mid] * 10) / 10;
    expect(metrics.avgNetRoi).toBe(expected);
  });
});

describe("opportunities-table columns", () => {
  it("has matching header and cell column ids", () => {
    expect(OPPORTUNITY_COLUMNS.length).toBe(12);
    const ids = OPPORTUNITY_COLUMNS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("action");
    expect(ids).toContain("profit");
    expect(ids).toContain("roi");
  });

  it("all columns are always visible", () => {
    expect(OPPORTUNITY_COLUMNS.every((c) => c.alwaysVisible)).toBe(true);
  });
});
