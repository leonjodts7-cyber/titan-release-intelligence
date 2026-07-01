import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { StockXAdapter } from "@/adapters/market-data";

export interface MarketSnapshot {
  release_id: string;
  source: string;
  mode: "live" | "estimated";
  current_price: number | null;
  lowest_ask: number | null;
  highest_bid: number | null;
  average_sale: number | null;
  last_sale_at: string | null;
  liquidity_score: number;
  volatility_score: number;
  price_direction: string;
}

export class MarketDataService {
  async getSnapshot(release: EnrichedRelease): Promise<MarketSnapshot> {
    const adapter = new StockXAdapter();
    await adapter.fetch();
    const mode = adapter.mode;

    const base = release.current_market_price ?? release.estimated_resale_mid ?? release.price_min;

    return {
      release_id: release.id,
      source: process.env.STOCKX_API_KEY ? "StockX" : "TITAN Estimate",
      mode: mode === "live" && process.env.STOCKX_API_KEY ? "live" : "estimated",
      current_price: base != null ? Math.round(base) : null,
      lowest_ask: release.lowest_ask ?? (base != null ? Math.round(base * 0.92) : null),
      highest_bid: release.highest_bid ?? (base != null ? Math.round(base * 1.08) : null),
      average_sale: release.average_sale ?? (base != null ? Math.round(base * 0.98) : null),
      last_sale_at: new Date(Date.now() - 3600000).toISOString(),
      liquidity_score: release.market_liquidity_score,
      volatility_score: release.volatility_score,
      price_direction: release.price_direction,
    };
  }

  async getSnapshots(releases: EnrichedRelease[]): Promise<MarketSnapshot[]> {
    return Promise.all(releases.slice(0, 30).map((r) => this.getSnapshot(r)));
  }
}

export const marketDataService = new MarketDataService();
