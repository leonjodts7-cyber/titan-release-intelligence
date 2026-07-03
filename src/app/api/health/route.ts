import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";
import { countLiveReleases } from "@/lib/data/releases";
import { getDataModeState } from "@/lib/data/mode";
import { getLastIngestAt } from "@/lib/sources/ingest";
import { getSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  let dbReachable = false;
  let releaseCount: number | null = null;
  let dbError: string | null = null;

  if (configured) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from("releases").select("id", { count: "exact", head: true });
      if (!error) {
        dbReachable = true;
        releaseCount = await countLiveReleases();
      } else {
        dbError = error.message;
      }
    }
  }

  const modeState = getDataModeState();
  const mode =
    configured && dbReachable && (releaseCount ?? 0) > 0
      ? "live"
      : configured && dbReachable && releaseCount === 0
        ? "demo"
        : modeState.mode;

  return NextResponse.json({
    ok: true,
    mode,
    dataMode: modeState,
    database: {
      configured,
      reachable: dbReachable,
      releaseCount,
      error: dbError,
    },
    ingest: {
      lastAt: getLastIngestAt(),
    },
    checkedAt: new Date().toISOString(),
  });
}
