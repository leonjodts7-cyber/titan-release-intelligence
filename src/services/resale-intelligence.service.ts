import type { Release, ReleaseType } from "@/types";
import { normalizeRoiForScore, toEur } from "@/lib/money";
import {
  computeNetProfit,
  defaultPlatformForCategory,
  type NetProfitResult,
} from "@/lib/payout";
import { computeConfidenceScore } from "@/lib/scoring-v2";

export interface ResaleIntelligence {
  retail_price_min: number | null;
  retail_price_max: number | null;
  retail_currency: string;
  retail_eur: number | null;
  estimated_resale_low: number | null;
  estimated_resale_mid: number | null;
  estimated_resale_high: number | null;
  resale_eur_mid: number | null;
  expected_profit_low: number | null;
  expected_profit_mid: number | null;
  expected_profit_high: number | null;
  expected_roi_low: number | null;
  expected_roi_mid: number | null;
  expected_roi_high: number | null;
  net_profit_mid_eur: number | null;
  net_roi_mid: number | null;
  gross_roi_mid: number | null;
  resale_platform: string;
  net_margin_score: number;
  resale_confidence_score: number;
  market_liquidity_score: number;
  demand_pressure_score: number;
  resale_risk_level: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  resale_explanation: string;
  is_estimated: boolean;
}

function seedFloat(id: string, min: number, max: number, salt = 0): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const n = Math.abs(h % 10000) / 10000;
  return min + n * (max - min);
}

const ROI_BANDS: Record<string, { low: number; mid: number; high: number }> = {
  ticket: { low: -15, mid: 25, high: 85 },
  product: { low: 5, mid: 45, high: 180 },
  collectible: { low: -5, mid: 55, high: 220 },
  fashion: { low: 0, mid: 35, high: 120 },
  gaming: { low: -10, mid: 20, high: 65 },
};

export class ResaleIntelligenceService {
  analyze(release: Partial<Release>): ResaleIntelligence {
    const retailMin = release.price_min ?? null;
    const retailMax = release.price_max ?? retailMin;
    const currency = release.currency ?? "EUR";
    const retailMid = retailMin != null ? (retailMin + (retailMax ?? retailMin)) / 2 : null;
    const retailEur = retailMid != null ? toEur(retailMid, currency) : null;

    const categorySlug = release.release_categories?.slug;
    const releaseType = (release.release_type ?? "product") as ReleaseType;
    const platform = defaultPlatformForCategory(categorySlug, releaseType);

    let resaleMid: number | null = null;
    let resaleLow: number | null = null;
    let resaleHigh: number | null = null;

    if (release.market_price && retailMid) {
      resaleMid = release.market_price;
      const spread = seedFloat(release.id ?? release.slug ?? "x", 0.08, 0.22);
      resaleLow = resaleMid * (1 - spread);
      resaleHigh = resaleMid * (1 + spread * 1.2);
    } else if (retailMid) {
      const band = ROI_BANDS[releaseType] ?? ROI_BANDS.product;
      const roiMid = seedFloat(release.id ?? "0", band.low, band.high, 1);
      const roiLow = Math.max(band.low, roiMid - seedFloat(release.id ?? "0", 8, 25, 2));
      const roiHigh = Math.min(band.high, roiMid + seedFloat(release.id ?? "0", 10, 35, 3));
      resaleLow = retailMid * (1 + roiLow / 100);
      resaleMid = retailMid * (1 + roiMid / 100);
      resaleHigh = retailMid * (1 + roiHigh / 100);
    }

    const profitLow = retailMid != null && resaleLow != null ? resaleLow - retailMid : null;
    const profitMid = retailMid != null && resaleMid != null ? resaleMid - retailMid : null;
    const profitHigh = retailMid != null && resaleHigh != null ? resaleHigh - retailMid : null;

    const roiLow = retailMid && profitLow != null ? (profitLow / retailMid) * 100 : null;
    const roiMid = retailMid && profitMid != null ? (profitMid / retailMid) * 100 : null;
    const roiHigh = retailMid && profitHigh != null ? (profitHigh / retailMid) * 100 : null;

    let net: NetProfitResult | null = null;
    if (retailMid != null && resaleMid != null) {
      net = computeNetProfit(retailMid, currency, resaleMid, currency, platform);
    }

    const spreadPct =
      resaleLow != null && resaleHigh != null && resaleMid
        ? ((resaleHigh - resaleLow) / resaleMid) * 100
        : 40;

    const dataAgeHours = release.last_checked_at
      ? (Date.now() - new Date(release.last_checked_at).getTime()) / 3600000
      : 72;

    const sourceCount = [release.official_url, release.source_url, release.market_price ? "market" : null].filter(Boolean).length;

    const confidence = computeConfidenceScore({
      sourceCount,
      estimateSpreadPct: spreadPct,
      dataAgeHours,
      hasOfficialUrl: Boolean(release.official_url),
    });

    const liquidity = this.calcLiquidity(release, releaseType);
    const demandPressure = Math.min(100, (release.demand_score ?? 50) * 0.55 + (release.sellout_probability ?? 50) * 0.45);
    const netMarginScore = normalizeRoiForScore(net?.net_roi_pct ?? roiMid ?? 0);

    return {
      retail_price_min: retailMin,
      retail_price_max: retailMax,
      retail_currency: currency,
      retail_eur: retailEur,
      estimated_resale_low: resaleLow != null ? Math.round(resaleLow) : null,
      estimated_resale_mid: resaleMid != null ? Math.round(resaleMid) : null,
      estimated_resale_high: resaleHigh != null ? Math.round(resaleHigh) : null,
      resale_eur_mid: resaleMid != null ? toEur(resaleMid, currency) : null,
      expected_profit_low: profitLow != null ? Math.round(profitLow) : null,
      expected_profit_mid: profitMid != null ? Math.round(profitMid) : null,
      expected_profit_high: profitHigh != null ? Math.round(profitHigh) : null,
      expected_roi_low: roiLow != null ? Math.round(roiLow * 10) / 10 : null,
      expected_roi_mid: roiMid != null ? Math.round(roiMid * 10) / 10 : null,
      expected_roi_high: roiHigh != null ? Math.round(roiHigh * 10) / 10 : null,
      net_profit_mid_eur: net?.net_profit_eur ?? null,
      net_roi_mid: net?.net_roi_pct ?? null,
      gross_roi_mid: net?.gross_roi_pct ?? (roiMid != null ? Math.round(roiMid * 10) / 10 : null),
      resale_platform: platform,
      net_margin_score: netMarginScore,
      resale_confidence_score: confidence,
      market_liquidity_score: liquidity,
      demand_pressure_score: Math.round(demandPressure),
      resale_risk_level: this.calcRiskTier(release, confidence),
      resale_explanation: this.buildExplanation(release, net, confidence, spreadPct),
      is_estimated: true,
    };
  }

  private calcLiquidity(release: Partial<Release>, type: ReleaseType): number {
    const sellout = release.sellout_probability ?? 50;
    const stock = release.stock_estimate ?? 10000;
    if (release.tcg_name) return Math.round(45 + sellout * 0.35);
    if (type === "ticket") return Math.round(35 + sellout * 0.4);
    if (type === "product") return Math.round(Math.max(25, 70 - stock / 800));
    return Math.round(40 + sellout * 0.25);
  }

  private calcRiskTier(release: Partial<Release>, confidence: number): ResaleIntelligence["resale_risk_level"] {
    if (confidence < 35 || release.status === "rumored") return "EXTREME";
    if (confidence < 50 || !release.official_url) return "HIGH";
    if (confidence < 65) return "MEDIUM";
    return "LOW";
  }

  private buildExplanation(
    release: Partial<Release>,
    net: NetProfitResult | null,
    confidence: number,
    spreadPct: number
  ): string {
    const roi = net?.net_roi_pct ?? 0;
    return `Estimated net ROI ${roi}% after ${net?.platform ?? "platform"} fees (EUR). ` +
      `Confidence ${confidence}% from ${spreadPct.toFixed(0)}% estimate spread and data freshness. (Estimated)`;
  }
}

export const resaleIntelligenceService = new ResaleIntelligenceService();
