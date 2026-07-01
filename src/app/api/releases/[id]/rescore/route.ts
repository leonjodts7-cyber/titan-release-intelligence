import { NextRequest, NextResponse } from "next/server";
import { getReleaseById } from "@/lib/data/releases";
import { aiScoringService } from "@/services/ai-scoring.service";
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

  const scores = await aiScoringService.score(release);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("releases").update({
        hype_score: scores.hype_score,
        demand_score: scores.demand_score,
        urgency_score: scores.urgency_score,
        sellout_probability: scores.sellout_probability,
        resale_interest_score: scores.resale_interest_score,
        confidence_score: scores.confidence_score,
        priority_level: scores.priority_level,
      }).eq("id", id);

      await supabase.from("release_scores").insert({
        release_id: id,
        ...scores,
        model_version: process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "rule-v1",
      });
    } catch {
      // Works with mock data when DB unavailable
    }
  }

  return NextResponse.json({ scores, message: "Release rescored successfully" });
}
