import type { Release } from "@/types";
import type { ResaleIntelligence } from "./resale-intelligence.service";

/** Deterministic pseudo-random from string seed (0–100) */
function seedHash(s: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h % 100);
}

function seedFloat(s: string, min: number, max: number, salt = 0): number {
  return min + (seedHash(s, salt) / 100) * (max - min);
}

export interface IntelligenceProfile {
  popularity_score: number;
  historical_sellout_minutes: number | null;
  historical_attendance_pct: number | null;
  artist_popularity_score: number | null;
  brand_popularity_score: number | null;
  google_trends_score: number;
  news_activity_score: number;
  social_activity_score: number;
  countries_interested: string[];
  official_sources: string[];
  market_confidence: number;
  historical_price_change_pct: number;
  historical_roi_pct: number;
  volatility_score: number;
  expected_sellout_hours: number | null;
  expected_queue_difficulty: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  ai_confidence: number;
  momentum_score: number;
  price_direction: "UP" | "DOWN" | "STABLE";
  // Event intelligence
  historical_sellout_pct: number | null;
  international_interest_score: number | null;
  travel_demand_score: number | null;
  extra_show_probability: number | null;
  sales_phases: string[];
  // TCG intelligence
  tcg_trend: "RISING" | "STABLE" | "FALLING" | null;
  grading_potential: number | null;
  collector_score: number | null;
  historical_growth_pct: number | null;
  population_estimate: number | null;
  // Market snapshots
  current_market_price: number | null;
  lowest_ask: number | null;
  highest_bid: number | null;
  average_sale: number | null;
  price_history_30d: number[];
  price_history_90d: number[];
  price_history_180d: number[];
}

export class IntelligenceEnrichmentService {
  enrich(release: Release, resale: ResaleIntelligence): IntelligenceProfile {
    const id = release.id + release.slug;
    const title = release.title.toLowerCase();
    const isTicket = release.release_type === "ticket";
    const isTcg = Boolean(release.tcg_name || release.release_type === "collectible");
    const isProduct = release.release_type === "product" || release.release_type === "fashion";

    const hype = release.hype_score ?? 50;
    const demand = release.demand_score ?? 50;
    const sellout = release.sellout_probability ?? 50;

    const googleTrends = Math.min(100, Math.round(hype * 0.7 + seedHash(id, 1) * 0.3));
    const newsActivity = Math.min(100, Math.round(demand * 0.5 + seedHash(id, 2) * 0.5));
    const socialActivity = Math.min(100, Math.round(hype * 0.6 + sellout * 0.2 + seedHash(id, 3) * 0.2));
    const momentum = Math.min(100, Math.round((newsActivity + socialActivity) / 2 + seedHash(id, 4) * 0.2));

    const retailMid = release.price_min != null
      ? (release.price_min + (release.price_max ?? release.price_min)) / 2
      : null;
    const marketMid = release.market_price ?? resale.estimated_resale_mid ?? retailMid;

    const histChange = seedFloat(id, -5, 35, 5);
    const histRoi = resale.expected_roi_mid ?? seedFloat(id, 10, 120, 6);
    const volatility = Math.min(100, Math.round(30 + seedHash(id, 7) * 0.5 + (sellout > 90 ? 15 : 0)));

    const countries = this.inferCountries(release);
    const sources = this.inferSources(release);

    const selloutHours = sellout >= 85
      ? Math.round(seedFloat(id, 0.5, 4, 8) * 10) / 10
      : sellout >= 70 ? Math.round(seedFloat(id, 4, 24, 9) * 10) / 10
      : null;

    const selloutMinutes = selloutHours != null ? Math.round(selloutHours * 60) : null;

    const queueDifficulty: IntelligenceProfile["expected_queue_difficulty"] =
      sellout >= 95 ? "EXTREME" : sellout >= 85 ? "HIGH" : sellout >= 70 ? "MEDIUM" : "LOW";

    const priceDirection: IntelligenceProfile["price_direction"] =
      histChange > 8 ? "UP" : histChange < -2 ? "DOWN" : "STABLE";

    const base30 = marketMid ?? retailMid ?? 100;
    const price30 = this.generateHistory(base30, id, 30, 0.08);
    const price90 = this.generateHistory(base30, id, 90, 0.12);
    const price180 = this.generateHistory(base30, id, 180, 0.15);

    const aiConfidence = Math.round(
      (resale.resale_confidence_score * 0.4 + release.confidence_score * 0.3 + momentum * 0.2 + (release.official_url ? 10 : 0))
    );

    return {
      popularity_score: Math.min(100, Math.round(hype * 0.5 + demand * 0.3 + socialActivity * 0.2)),
      historical_sellout_minutes: selloutMinutes,
      historical_attendance_pct: isTicket && release.capacity_estimate
        ? Math.round(85 + seedHash(id, 10) * 0.14)
        : null,
      artist_popularity_score: release.artists?.name ? Math.min(100, hype + seedHash(id, 11) * 0.1) : null,
      brand_popularity_score: release.brands?.name ? Math.min(100, demand + seedHash(id, 12) * 0.1) : null,
      google_trends_score: googleTrends,
      news_activity_score: newsActivity,
      social_activity_score: socialActivity,
      countries_interested: countries,
      official_sources: sources,
      market_confidence: Math.round(resale.resale_confidence_score * 0.7 + aiConfidence * 0.3),
      historical_price_change_pct: Math.round(histChange * 10) / 10,
      historical_roi_pct: Math.round(histRoi),
      volatility_score: volatility,
      expected_sellout_hours: selloutHours,
      expected_queue_difficulty: queueDifficulty,
      ai_confidence: Math.min(98, aiConfidence),
      momentum_score: momentum,
      price_direction: priceDirection,
      historical_sellout_pct: isTicket ? Math.min(99, sellout + seedHash(id, 13) * 0.05) : null,
      international_interest_score: isTicket ? Math.min(100, demand + seedHash(id, 14) * 0.2) : null,
      travel_demand_score: isTicket && title.includes("tour") ? Math.min(100, 60 + seedHash(id, 15)) : isTicket ? Math.min(100, 40 + seedHash(id, 16)) : null,
      extra_show_probability: isTicket && sellout > 90 ? Math.round(seedFloat(id, 15, 65, 17)) : null,
      sales_phases: isTicket ? this.inferSalesPhases(release) : [],
      tcg_trend: isTcg ? (momentum > 65 ? "RISING" : momentum < 40 ? "FALLING" : "STABLE") : null,
      grading_potential: isTcg ? Math.min(100, Math.round(50 + seedHash(id, 18) * 0.45)) : null,
      collector_score: isTcg ? Math.min(100, Math.round(demand * 0.8 + seedHash(id, 19) * 0.2)) : null,
      historical_growth_pct: isTcg ? Math.round(seedFloat(id, 5, 180, 20)) : null,
      population_estimate: isTcg && release.card_rarity ? Math.round(seedFloat(id, 500, 50000, 21)) : null,
      current_market_price: marketMid != null ? Math.round(marketMid) : null,
      lowest_ask: marketMid != null ? Math.round(marketMid * 0.92) : null,
      highest_bid: marketMid != null ? Math.round(marketMid * 1.08) : null,
      average_sale: marketMid != null ? Math.round(marketMid * 0.98) : null,
      price_history_30d: price30,
      price_history_90d: price90,
      price_history_180d: price180,
    };
  }

  private generateHistory(base: number, id: string, points: number, variance: number): number[] {
    const out: number[] = [];
    let v = base * (1 - variance);
    for (let i = 0; i < points; i++) {
      const drift = seedFloat(id, -variance * 0.3, variance * 0.5, 100 + i);
      v = Math.max(base * 0.5, v * (1 + drift / 100));
      out.push(Math.round(v));
    }
    out[out.length - 1] = Math.round(base);
    return out;
  }

  private inferCountries(release: Release): string[] {
    const out: string[] = [];
    if (release.countries?.code) out.push(release.countries.code);
    const extra = ["US", "GB", "DE", "FR", "NL", "JP", "CA", "AU"];
    for (let i = 0; i < 3; i++) {
      const c = extra[seedHash(release.id, 30 + i) % extra.length];
      if (!out.includes(c)) out.push(c);
    }
    return out.slice(0, 5);
  }

  private inferSources(release: Release): string[] {
    const s: string[] = [];
    if (release.official_url) s.push(new URL(release.official_url).hostname.replace("www.", ""));
    if (release.source_url) {
      try { s.push(new URL(release.source_url).hostname.replace("www.", "")); } catch { /* */ }
    }
    if (release.tcg_name) s.push("TCGplayer", "CardMarket");
    if (release.brands?.name === "Nike" || release.brands?.name === "Jordan") s.push("Nike SNKRS", "StockX");
    return [...new Set(s)].slice(0, 5);
  }

  private inferSalesPhases(release: Release): string[] {
    const phases: string[] = [];
    if (release.presale_starts_at) phases.push("Presale");
    if (release.general_sale_starts_at) phases.push("General Sale");
    if (release.release_starts_at) phases.push("Event Date");
    return phases.length ? phases : ["Announced"];
  }
}

export const intelligenceEnrichmentService = new IntelligenceEnrichmentService();
