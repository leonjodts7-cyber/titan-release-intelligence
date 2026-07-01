export type CurrencyCode = "EUR" | "USD" | "GBP" | "CAD" | "CHF";

/** Fallback FX rates: 1 unit of currency → EUR */
export const DEFAULT_FX_TO_EUR: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CAD: 0.68,
  CHF: 1.05,
};

export function normalizeCurrency(code: string | null | undefined): string {
  return (code ?? "EUR").toUpperCase();
}

export function toEur(
  amount: number,
  currency: string,
  rates: Record<string, number> = DEFAULT_FX_TO_EUR
): number {
  const code = normalizeCurrency(currency);
  const rate = rates[code] ?? rates.EUR ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

export function fromEur(
  amountEur: number,
  currency: string,
  rates: Record<string, number> = DEFAULT_FX_TO_EUR
): number {
  const code = normalizeCurrency(currency);
  const rate = rates[code] ?? rates.EUR ?? 1;
  if (rate === 0) return amountEur;
  return Math.round((amountEur / rate) * 100) / 100;
}

export function formatEur(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatEurPrecise(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Map ROI -20..250 → 0..100 for scoring */
export function normalizeRoiForScore(roiPct: number): number {
  const clamped = Math.max(-20, Math.min(250, roiPct));
  return Math.round(((clamped + 20) / 270) * 100);
}
