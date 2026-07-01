import { DEFAULT_FEE_PROFILES, type FeeProfile } from "@/lib/payout";
import { getSupabaseClient } from "@/lib/supabase/admin";

export async function getFeeProfiles(): Promise<FeeProfile[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from("fee_profiles").select("platform, seller_fee_pct, payment_fee_pct, shipping_flat_eur");
    if (data?.length) {
      return data.map((r) => ({
        platform: r.platform,
        seller_fee_pct: Number(r.seller_fee_pct),
        payment_fee_pct: Number(r.payment_fee_pct),
        shipping_flat_eur: Number(r.shipping_flat_eur),
      }));
    }
  }
  return [...DEFAULT_FEE_PROFILES];
}
