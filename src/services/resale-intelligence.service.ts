import type { Release, ReleaseType } from "@/types";

export interface ResaleIntelligence {
  retail_price_min: number | null;
  retail_price_max: number | null;
  retail_currency: string;
  estimated_resale_low: number | null;
  estimated_resale_mid: number | null;
  estimated_resale_high: number | null;
  expected_profit_low: number | null;
  expected_profit_mid: number | null;
  expected_profit_high: number | null;
  expected_roi_low: number | null;
  expected_roi_mid: number | null;
  expected_roi_high: number | null;
  resale_confidence_score: number;
  market_liquidity_score: number;
  demand_pressure_score: number;
  resale_risk_level: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  resale_explanation: string;
  is_estimated: boolean;
}

const EXTREME_RESALE = [
  "super bowl", "champions league final", "taylor swift", "travis scott",
  "jordan", "coldplay", "tomorrowland", "world cup", "euro final",
  "nba finals", "ufc", "olympics", "wimbledon",
];
const HIGH_RESALE = [
  "nike mercurial", "nike phantom", "adidas f50", "adidas predator",
  "drake", "beyoncé", "bad bunny", "billie eilish", "dua lipa",
  "el clasico", "premier league", "formula 1", "supreme", "palace",
  "limited", "snkrs", "festivals", "pokémon", "pokemon", "one piece",
  "lorcana", "charizard", "travis scott",
];
const TCG_KEYWORDS = ["pokémon", "pokemon", "one piece", "lorcana", "magic", "yu-gi-oh", "tcg", "booster", "elite trainer"];

export class ResaleIntelligenceService {
  analyze(release: Partial<Release>): ResaleIntelligence {
    const retailMin = release.price_min ?? null;
    const retailMax = release.price_max ?? retailMin;
    const currency = release.currency ?? "EUR";
    const title = (release.title ?? "").toLowerCase();
    const category = (release.release_categories?.name ?? "").toLowerCase();
    const combined = `${title} ${category}`;

    const demandMultiplier = this.getDemandMultiplier(combined, release);
    const retailMid = retailMin != null ? (retailMin + (retailMax ?? retailMin)) / 2 : null;

    let resaleLow = retailMid != null ? retailMid * demandMultiplier.low : null;
    let resaleMid = retailMid != null ? retailMid * demandMultiplier.mid : null;
    let resaleHigh = retailMid != null ? retailMid * demandMultiplier.high : null;

    if (release.release_type === "ticket" && release.capacity_estimate) {
      const scarcityBoost = Math.min(2.5, 1 + (release.sellout_probability ?? 50) / 100);
      if (resaleMid) {
        resaleLow = resaleLow! * scarcityBoost * 0.85;
        resaleMid = resaleMid * scarcityBoost;
        resaleHigh = resaleHigh! * scarcityBoost * 1.15;
      }
    }

    if (release.release_type === "product" && release.stock_estimate && release.stock_estimate < 5000) {
      const scarcity = Math.min(3, 1.5 + (5000 - release.stock_estimate) / 5000);
      if (resaleMid) {
        resaleLow = resaleLow! * scarcity * 0.9;
        resaleMid = resaleMid * scarcity;
        resaleHigh = resaleHigh! * scarcity * 1.2;
      }
    }

    if (release.release_type === "collectible" || release.tcg_name) {
      const tcgBoost = this.getTcgMultiplier(release);
      if (resaleMid) {
        resaleLow = resaleLow! * tcgBoost.low;
        resaleMid = resaleMid * tcgBoost.mid;
        resaleHigh = resaleHigh! * tcgBoost.high;
      }
      if (release.market_price && retailMid && release.market_price > retailMid) {
        resaleMid = release.market_price;
        resaleLow = release.market_price * 0.85;
        resaleHigh = release.market_price * 1.35;
      }
    }

    const profitLow = retailMid != null && resaleLow != null ? resaleLow - retailMid : null;
    const profitMid = retailMid != null && resaleMid != null ? resaleMid - retailMid : null;
    const profitHigh = retailMid != null && resaleHigh != null ? resaleHigh - retailMid : null;

    const roiLow = retailMid && profitLow != null ? (profitLow / retailMid) * 100 : null;
    const roiMid = retailMid && profitMid != null ? (profitMid / retailMid) * 100 : null;
    const roiHigh = retailMid && profitHigh != null ? (profitHigh / retailMid) * 100 : null;

    const confidence = this.calcConfidence(release, demandMultiplier.tier);
    const liquidity = this.calcLiquidity(release, demandMultiplier.tier);
    const demandPressure = Math.min(100, (release.demand_score ?? 50) * 0.6 + (release.sellout_probability ?? 50) * 0.4);

    return {
      retail_price_min: retailMin,
      retail_price_max: retailMax,
      retail_currency: currency,
      estimated_resale_low: resaleLow != null ? Math.round(resaleLow) : null,
      estimated_resale_mid: resaleMid != null ? Math.round(resaleMid) : null,
      estimated_resale_high: resaleHigh != null ? Math.round(resaleHigh) : null,
      expected_profit_low: profitLow != null ? Math.round(profitLow) : null,
      expected_profit_mid: profitMid != null ? Math.round(profitMid) : null,
      expected_profit_high: profitHigh != null ? Math.round(profitHigh) : null,
      expected_roi_low: roiLow != null ? Math.round(roiLow) : null,
      expected_roi_mid: roiMid != null ? Math.round(roiMid) : null,
      expected_roi_high: roiHigh != null ? Math.round(roiHigh) : null,
      resale_confidence_score: confidence,
      market_liquidity_score: liquidity,
      demand_pressure_score: Math.round(demandPressure),
      resale_risk_level: demandMultiplier.tier,
      resale_explanation: this.buildExplanation(release, demandMultiplier.tier, confidence),
      is_estimated: true,
    };
  }

  private getDemandMultiplier(combined: string, release: Partial<Release>): {
    low: number; mid: number; high: number; tier: ResaleIntelligence["resale_risk_level"];
  } {
    if (EXTREME_RESALE.some((k) => combined.includes(k))) {
      return { low: 1.8, mid: 2.5, high: 4.0, tier: "EXTREME" };
    }
    if (HIGH_RESALE.some((k) => combined.includes(k))) {
      return { low: 1.4, mid: 1.9, high: 2.8, tier: "HIGH" };
    }
    if ((release.sellout_probability ?? 0) >= 85) {
      return { low: 1.3, mid: 1.7, high: 2.4, tier: "HIGH" };
    }
    if ((release.hype_score ?? 0) >= 70) {
      return { low: 1.15, mid: 1.4, high: 1.8, tier: "MEDIUM" };
    }
    return { low: 1.0, mid: 1.15, high: 1.35, tier: "LOW" };
  }

  private calcConfidence(release: Partial<Release>, tier: string): number {
    let score = 45;
    if (release.official_url) score += 15;
    if (release.price_min) score += 10;
    if (release.capacity_estimate || release.stock_estimate) score += 10;
    if (tier === "EXTREME") score += 15;
    else if (tier === "HIGH") score += 10;
    if ((release.confidence_score ?? 0) > 80) score += 5;
    return Math.min(95, Math.max(35, score));
  }

  private calcLiquidity(release: Partial<Release>, tier: string): number {
    const type = release.release_type as ReleaseType;
    if (release.tcg_name === "Pokémon") return tier === "EXTREME" ? 90 : 78;
    if (release.tcg_name) return 72;
    if (type === "ticket" && tier === "EXTREME") return 92;
    if (type === "product" && tier === "EXTREME") return 85;
    if (tier === "HIGH") return 72;
    if (tier === "MEDIUM") return 55;
    return 40;
  }

  private getTcgMultiplier(release: Partial<Release>): { low: number; mid: number; high: number } {
    const name = (release.tcg_name ?? release.title ?? "").toLowerCase();
    if (name.includes("pokémon") || name.includes("pokemon") || name.includes("charizard")) {
      return { low: 1.6, mid: 2.4, high: 4.0 };
    }
    if (name.includes("one piece")) return { low: 1.5, mid: 2.2, high: 3.5 };
    if (name.includes("lorcana")) return { low: 1.4, mid: 2.0, high: 3.0 };
    if (TCG_KEYWORDS.some((k) => name.includes(k))) return { low: 1.3, mid: 1.8, high: 2.6 };
    return { low: 1.2, mid: 1.5, high: 2.0 };
  }

  private buildExplanation(release: Partial<Release>, tier: string, confidence: number): string {
    if (release.tcg_name || release.release_type === "collectible") {
      const sealed = release.sealed_product ? "Sealed product premium" : "Singles/collection";
      return `Estimated TCG/collector market: ${sealed} demand for ${release.tcg_name ?? "category"}. MSRP vs market spread analyzed. Confidence ${confidence}% (Estimated).`;
    }
    const type = release.release_type === "ticket" ? "secondary ticket market" : "resale market";
    if (tier === "EXTREME") {
      return `Estimated ${type} demand is extreme based on global artist/event profile, limited supply, and historical sellout patterns. Confidence ${confidence}% (Estimated).`;
    }
    if (tier === "HIGH") {
      return `Strong ${type} potential driven by brand/artist demand and limited availability. Confidence ${confidence}% (Estimated).`;
    }
    return `Moderate ${type} potential. Profit estimates based on category benchmarks and demand signals. Confidence ${confidence}% (Estimated).`;
  }
}

export const resaleIntelligenceService = new ResaleIntelligenceService();
