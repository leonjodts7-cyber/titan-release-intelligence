import { describe, expect, it } from "vitest";
import { netPayout, computeNetProfit } from "@/lib/payout";

describe("payout", () => {
  it("deducts StockX fees and shipping", () => {
    const payout = netPayout(300, "stockx");
    expect(payout).toBeLessThan(300);
    expect(payout).toBeGreaterThan(240);
  });

  it("computes net ROI below gross ROI", () => {
    const result = computeNetProfit(100, "EUR", 200, "EUR", "stockx");
    expect(result.net_roi_pct).toBeLessThan(result.gross_roi_pct);
    expect(result.net_profit_eur).toBeLessThan(result.gross_profit_eur);
  });
});
