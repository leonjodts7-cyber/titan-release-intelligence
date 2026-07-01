import { NextRequest, NextResponse } from "next/server";
import { getReleaseById } from "@/lib/data/releases";
import { enrichRelease } from "@/lib/data/enrich-releases";
import { resaleIntelligenceService } from "@/services/resale-intelligence.service";
import { getSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const release = await getReleaseById(id);
  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  const resale = resaleIntelligenceService.analyze(release);
  const enriched = enrichRelease(release);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("releases").update({
        estimated_resale_low: resale.estimated_resale_low,
        estimated_resale_mid: resale.estimated_resale_mid,
        estimated_resale_high: resale.estimated_resale_high,
        expected_profit_low: resale.expected_profit_low,
        expected_profit_mid: resale.expected_profit_mid,
        expected_profit_high: resale.expected_profit_high,
        expected_roi_low: resale.expected_roi_low,
        expected_roi_mid: resale.expected_roi_mid,
        expected_roi_high: resale.expected_roi_high,
        resale_confidence_score: resale.resale_confidence_score,
        market_liquidity_score: resale.market_liquidity_score,
        demand_pressure_score: resale.demand_pressure_score,
        resale_risk_level: resale.resale_risk_level,
        resale_explanation: resale.resale_explanation,
        resale_is_estimated: true,
      }).eq("id", id);
    } catch {
      // demo mode
    }
  }

  return NextResponse.json({ resale: enriched, message: "Resale estimate recalculated" });
}
