import { DEFAULT_FX_TO_EUR } from "@/lib/money";
import { getSupabaseClient } from "@/lib/supabase/admin";

export async function getFxRates(): Promise<Record<string, number>> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from("fx_rates").select("currency, rate_to_eur");
    if (data?.length) {
      return Object.fromEntries(data.map((r) => [r.currency, Number(r.rate_to_eur)]));
    }
  }
  return { ...DEFAULT_FX_TO_EUR };
}
