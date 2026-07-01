import { describe, expect, it } from "vitest";
import { toEur, fromEur, normalizeRoiForScore } from "@/lib/money";

describe("money", () => {
  it("converts USD to EUR", () => {
    expect(toEur(100, "USD")).toBe(92);
  });

  it("converts GBP to EUR", () => {
    expect(toEur(100, "GBP")).toBe(117);
  });

  it("round-trips EUR", () => {
    expect(fromEur(toEur(50, "USD"), "USD")).toBe(50);
  });

  it("normalizes ROI for scoring", () => {
    expect(normalizeRoiForScore(-20)).toBe(0);
    expect(normalizeRoiForScore(250)).toBe(100);
    expect(normalizeRoiForScore(115)).toBeGreaterThan(40);
  });
});
