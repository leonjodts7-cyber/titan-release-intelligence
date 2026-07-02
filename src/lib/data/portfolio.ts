import { netPayout } from "@/lib/payout";

export type PositionStatus = "holding" | "listed" | "sold";

export interface Position {
  id: string;
  release_id: string | null;
  name: string;
  qty: number;
  buy_price_eur: number;
  buy_date: string;
  status: PositionStatus;
  sale_platform: string | null;
  sale_price_eur: number | null;
  predicted_low_eur: number | null;
  predicted_high_eur: number | null;
  sold_at: string | null;
  created_at: string;
}

export interface PredictionSnapshot {
  id: string;
  position_id: string;
  release_id: string | null;
  predicted_low_eur: number | null;
  predicted_high_eur: number | null;
  actual_sale_eur: number | null;
  within_range: boolean | null;
  deviation_pct: number | null;
  created_at: string;
}

let positionsCache: Position[] = [
  {
    id: "pos-1", release_id: "41", name: "Air Jordan 1 Travis Scott Medium Olive", qty: 1,
    buy_price_eur: 150, buy_date: "2026-01-10", status: "sold", sale_platform: "stockx",
    sale_price_eur: 410, predicted_low_eur: 320, predicted_high_eur: 480, sold_at: "2026-02-15T12:00:00Z", created_at: "2026-01-10T10:00:00Z",
  },
  {
    id: "pos-2", release_id: "57", name: "Pokémon 151 UPC", qty: 2,
    buy_price_eur: 120, buy_date: "2026-02-01", status: "sold", sale_platform: "tcgplayer",
    sale_price_eur: 195, predicted_low_eur: 180, predicted_high_eur: 240, sold_at: "2026-03-01T09:00:00Z", created_at: "2026-02-01T08:00:00Z",
  },
  {
    id: "pos-3", release_id: "43", name: "Nike Mercurial Superfly Elite", qty: 1,
    buy_price_eur: 220, buy_date: "2026-03-05", status: "holding", sale_platform: null,
    sale_price_eur: null, predicted_low_eur: 260, predicted_high_eur: 340, sold_at: null, created_at: "2026-03-05T14:00:00Z",
  },
];

const snapshotsCache: PredictionSnapshot[] = [
  {
    id: "snap-1", position_id: "pos-1", release_id: "41",
    predicted_low_eur: 320, predicted_high_eur: 480, actual_sale_eur: 410,
    within_range: true, deviation_pct: 0, created_at: "2026-02-15T12:00:00Z",
  },
  {
    id: "snap-2", position_id: "pos-2", release_id: "57",
    predicted_low_eur: 180, predicted_high_eur: 240, actual_sale_eur: 195,
    within_range: true, deviation_pct: 0, created_at: "2026-03-01T09:00:00Z",
  },
];

export function getPositions(): Position[] {
  return [...positionsCache];
}

export function getPredictionSnapshots(): PredictionSnapshot[] {
  return [...snapshotsCache];
}

export function addPosition(input: Omit<Position, "id" | "created_at" | "sale_platform" | "sale_price_eur" | "sold_at">): Position {
  const pos: Position = {
    ...input,
    id: `pos-${Date.now()}`,
    sale_platform: null,
    sale_price_eur: null,
    sold_at: null,
    created_at: new Date().toISOString(),
  };
  positionsCache.unshift(pos);
  return pos;
}

export function updatePosition(id: string, patch: Partial<Position>): Position | null {
  const idx = positionsCache.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  positionsCache[idx] = { ...positionsCache[idx], ...patch };
  return positionsCache[idx];
}

export function recordSale(id: string, platform: string, salePriceEur: number): PredictionSnapshot | null {
  const pos = positionsCache.find((p) => p.id === id);
  if (!pos) return null;
  pos.status = "sold";
  pos.sale_platform = platform;
  pos.sale_price_eur = salePriceEur;
  pos.sold_at = new Date().toISOString();

  const mid = pos.predicted_low_eur != null && pos.predicted_high_eur != null
    ? (pos.predicted_low_eur + pos.predicted_high_eur) / 2
    : null;
  const within =
    pos.predicted_low_eur != null && pos.predicted_high_eur != null
      ? salePriceEur >= pos.predicted_low_eur && salePriceEur <= pos.predicted_high_eur
      : null;
  const deviation = mid && mid > 0 ? ((salePriceEur - mid) / mid) * 100 : null;

  const snap: PredictionSnapshot = {
    id: `snap-${Date.now()}`,
    position_id: id,
    release_id: pos.release_id,
    predicted_low_eur: pos.predicted_low_eur,
    predicted_high_eur: pos.predicted_high_eur,
    actual_sale_eur: salePriceEur,
    within_range: within,
    deviation_pct: deviation != null ? Math.round(deviation * 10) / 10 : null,
    created_at: new Date().toISOString(),
  };
  snapshotsCache.unshift(snap);
  return snap;
}

export function deletePosition(id: string): boolean {
  const idx = positionsCache.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  positionsCache.splice(idx, 1);
  return true;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function getPortfolioStats(positions: Position[] = getPositions()) {
  const sold = positions.filter((p) => p.status === "sold" && p.sale_price_eur != null);
  const invested = positions.reduce((s, p) => s + p.buy_price_eur * p.qty, 0);
  const netProfit = sold.reduce((s, p) => {
    const payout = netPayout(p.sale_price_eur ?? 0, p.sale_platform ?? "stockx");
    return s + (payout - p.buy_price_eur * p.qty);
  }, 0);
  const roiPcts = sold.map((p) => {
    const payout = netPayout(p.sale_price_eur ?? 0, p.sale_platform ?? "stockx");
    return p.buy_price_eur > 0 ? ((payout - p.buy_price_eur) / p.buy_price_eur) * 100 : 0;
  });
  const medianRoi = Math.round(median(roiPcts) * 10) / 10;
  const wins = sold.filter((p) => {
    const payout = netPayout(p.sale_price_eur ?? 0, p.sale_platform ?? "stockx");
    return payout > p.buy_price_eur;
  }).length;
  const best = sold.reduce<Position | null>((b, p) => {
    const payout = netPayout(p.sale_price_eur ?? 0, p.sale_platform ?? "stockx");
    const profit = payout - p.buy_price_eur * p.qty;
    if (!b) return p;
    const bPayout = netPayout(b.sale_price_eur ?? 0, b.sale_platform ?? "stockx");
    return profit > (bPayout - b.buy_price_eur * b.qty) ? p : b;
  }, null);
  const worst = sold.reduce<Position | null>((w, p) => {
    const payout = netPayout(p.sale_price_eur ?? 0, p.sale_platform ?? "stockx");
    const profit = payout - p.buy_price_eur * p.qty;
    if (!w) return p;
    const wPayout = netPayout(w.sale_price_eur ?? 0, w.sale_platform ?? "stockx");
    return profit < (wPayout - w.buy_price_eur * w.qty) ? p : w;
  }, null);

  return {
    invested,
    netProfit: Math.round(netProfit * 100) / 100,
    avgRoi: medianRoi,
    medianRoi,
    winRate: sold.length ? Math.round((wins / sold.length) * 100) : 0,
    best,
    worst,
    soldCount: sold.length,
  };
}

export function getModelAccuracy(snapshots: PredictionSnapshot[] = getPredictionSnapshots()) {
  const soldSnaps = snapshots.filter((s) => s.actual_sale_eur != null);
  if (soldSnaps.length < 5) {
    return { sampleSize: soldSnaps.length, accuracyPct: null as number | null, avgDeviation: null as number | null };
  }
  const within = soldSnaps.filter((s) => s.within_range).length;
  const avgDev =
    soldSnaps.reduce((s, snap) => s + Math.abs(snap.deviation_pct ?? 0), 0) / soldSnaps.length;
  return {
    sampleSize: soldSnaps.length,
    accuracyPct: Math.round((within / soldSnaps.length) * 100),
    avgDeviation: Math.round(avgDev * 10) / 10,
  };
}
