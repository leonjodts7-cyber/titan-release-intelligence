import { toEur } from "@/lib/money";

export interface FeeProfile {
  platform: string;
  seller_fee_pct: number;
  payment_fee_pct: number;
  shipping_flat_eur: number;
}

export const DEFAULT_FEE_PROFILES: FeeProfile[] = [
  { platform: "stockx", seller_fee_pct: 9.5, payment_fee_pct: 3, shipping_flat_eur: 15 },
  { platform: "goat", seller_fee_pct: 9.5, payment_fee_pct: 2.9, shipping_flat_eur: 14 },
  { platform: "ebay", seller_fee_pct: 12, payment_fee_pct: 3.5, shipping_flat_eur: 8 },
  { platform: "stubhub", seller_fee_pct: 15, payment_fee_pct: 0, shipping_flat_eur: 0 },
  { platform: "ticketmaster_resale", seller_fee_pct: 10, payment_fee_pct: 0, shipping_flat_eur: 0 },
  { platform: "tcgplayer", seller_fee_pct: 10.25, payment_fee_pct: 2.5, shipping_flat_eur: 4 },
  { platform: "direct", seller_fee_pct: 0, payment_fee_pct: 2.5, shipping_flat_eur: 6 },
];

export function getFeeProfile(platform: string, profiles: FeeProfile[] = DEFAULT_FEE_PROFILES): FeeProfile {
  const key = platform.toLowerCase().replace(/\s+/g, "_");
  return profiles.find((p) => p.platform === key) ?? profiles.find((p) => p.platform === "direct")!;
}

export function defaultPlatformForCategory(categorySlug: string | undefined, releaseType: string): string {
  if (categorySlug === "tcg-collectibles" || releaseType === "collectible") return "tcgplayer";
  if (releaseType === "ticket") return "stubhub";
  if (releaseType === "product" || releaseType === "fashion") return "stockx";
  return "direct";
}

/** Net seller payout after platform + payment fees and flat shipping (all in EUR) */
export function netPayout(
  salePriceEur: number,
  platform: string,
  profiles: FeeProfile[] = DEFAULT_FEE_PROFILES
): number {
  const profile = getFeeProfile(platform, profiles);
  const afterSeller = salePriceEur * (1 - profile.seller_fee_pct / 100);
  const afterPayment = afterSeller * (1 - profile.payment_fee_pct / 100);
  return Math.round((afterPayment - profile.shipping_flat_eur) * 100) / 100;
}

export interface NetProfitResult {
  retail_eur: number;
  sale_price_eur: number;
  net_payout_eur: number;
  gross_profit_eur: number;
  net_profit_eur: number;
  gross_roi_pct: number;
  net_roi_pct: number;
  platform: string;
}

export function computeNetProfit(
  retailAmount: number,
  retailCurrency: string,
  saleAmount: number,
  saleCurrency: string,
  platform: string,
  fxRates?: Record<string, number>
): NetProfitResult {
  const retailEur = toEur(retailAmount, retailCurrency, fxRates);
  const saleEur = toEur(saleAmount, saleCurrency, fxRates);
  const payout = netPayout(saleEur, platform);
  const grossProfit = saleEur - retailEur;
  const netProfit = payout - retailEur;
  const grossRoi = retailEur > 0 ? (grossProfit / retailEur) * 100 : 0;
  const netRoi = retailEur > 0 ? (netProfit / retailEur) * 100 : 0;

  return {
    retail_eur: retailEur,
    sale_price_eur: saleEur,
    net_payout_eur: payout,
    gross_profit_eur: Math.round(grossProfit * 100) / 100,
    net_profit_eur: Math.round(netProfit * 100) / 100,
    gross_roi_pct: Math.round(grossRoi * 10) / 10,
    net_roi_pct: Math.round(netRoi * 10) / 10,
    platform,
  };
}
