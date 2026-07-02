/** Deterministic pseudo-random from string seed (0–1) */
function seedUnit(s: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 10000) / 10000;
}

export type PriceHistoryCategory =
  | "ticket"
  | "sneaker"
  | "tcg"
  | "gaming"
  | "fashion"
  | "default";

export function inferPriceHistoryCategory(
  releaseType: string,
  categorySlug?: string,
  tcgName?: string | null
): PriceHistoryCategory {
  if (releaseType === "ticket") return "ticket";
  if (tcgName || categorySlug === "tcg-collectibles") return "tcg";
  if (categorySlug === "limited-sneakers") return "sneaker";
  if (releaseType === "gaming" || categorySlug === "gaming") return "gaming";
  if (releaseType === "fashion" || categorySlug === "fashion-drops") return "fashion";
  return "default";
}

interface VolatilityProfile {
  dailyVol: number;
  driftBias: number;
  spikeChance: number;
  dipChance: number;
}

const PROFILES: Record<PriceHistoryCategory, VolatilityProfile> = {
  ticket: { dailyVol: 0.045, driftBias: 0.012, spikeChance: 0.08, dipChance: 0.06 },
  sneaker: { dailyVol: 0.028, driftBias: 0.004, spikeChance: 0.05, dipChance: 0.04 },
  tcg: { dailyVol: 0.018, driftBias: 0.006, spikeChance: 0.04, dipChance: 0.03 },
  gaming: { dailyVol: 0.022, driftBias: 0.003, spikeChance: 0.04, dipChance: 0.05 },
  fashion: { dailyVol: 0.025, driftBias: 0.005, spikeChance: 0.05, dipChance: 0.04 },
  default: { dailyVol: 0.02, driftBias: 0.004, spikeChance: 0.04, dipChance: 0.03 },
};

/**
 * Genereert realistische prijshistoriek als random walk met drift naar targetPrice.
 */
export function generatePriceHistory(
  targetPrice: number,
  seed: string,
  points: number,
  category: PriceHistoryCategory = "default"
): number[] {
  if (points < 2 || targetPrice <= 0) return [targetPrice];

  const profile = PROFILES[category];
  const startPrice = targetPrice * (0.72 + seedUnit(seed, 1) * 0.22);
  const out: number[] = [Math.round(startPrice)];
  let price = startPrice;

  for (let i = 1; i < points; i++) {
    const progress = i / (points - 1);
    const targetDrift = ((targetPrice - price) / price) * (0.08 + progress * 0.18);
    const noise = (seedUnit(seed, 100 + i) - 0.5) * profile.dailyVol * 2;
    let change = targetDrift + noise + profile.driftBias * (seedUnit(seed, 200 + i) - 0.4);

    const roll = seedUnit(seed, 300 + i);
    if (roll < profile.spikeChance) change += profile.dailyVol * (1.5 + seedUnit(seed, 400 + i));
    else if (roll > 1 - profile.dipChance) change -= profile.dailyVol * (1.2 + seedUnit(seed, 500 + i));

    price = Math.max(targetPrice * 0.55, price * (1 + change));
    out.push(Math.round(price));
  }

  out[out.length - 1] = Math.round(targetPrice);
  return out;
}

export function slicePriceHistory(history: number[], days: 7 | 30 | 90): number[] {
  if (history.length <= days) return history;
  return history.slice(-days);
}
