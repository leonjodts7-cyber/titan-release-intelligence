import { NextResponse } from "next/server";
import { getReleaseById } from "@/lib/data/releases";
import { createServiceClient, createAnonServiceClient } from "@/lib/supabase/admin";

function getClient() {
  try {
    return createServiceClient();
  } catch {
    return createAnonServiceClient();
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const release = await getReleaseById(id);
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let updates = [];
  let scores = null;
  let sourceReliability = null;

  try {
    const supabase = getClient();
    const { data: updateData } = await supabase
      .from("release_updates")
      .select("*")
      .eq("release_id", id)
      .order("detected_at", { ascending: false })
      .limit(20);
    updates = updateData ?? [];

    const { data: scoreData } = await supabase
      .from("release_scores")
      .select("*")
      .eq("release_id", id)
      .order("scored_at", { ascending: false })
      .limit(1)
      .single();
    scores = scoreData;

    if (release.source_adapter_id) {
      const { data: source } = await supabase
        .from("source_adapters")
        .select("name, reliability_score, last_success_at, last_error")
        .eq("id", release.source_adapter_id)
        .single();
      sourceReliability = source;
    }
  } catch {
    // use defaults
  }

  return NextResponse.json({ release, updates, scores, sourceReliability });
}
