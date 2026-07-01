import { NextRequest, NextResponse } from "next/server";
import { getReleaseById } from "@/lib/data/releases";
import { watchlistService } from "@/services/watchlist.service";
import { getWatchlists } from "@/lib/data/notifications";
import { enrichRelease } from "@/lib/data/enrich-releases";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const releaseId = body.releaseId;

  if (!releaseId) {
    return NextResponse.json({ error: "releaseId required" }, { status: 400 });
  }

  const release = await getReleaseById(releaseId);
  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  const enriched = enrichRelease(release);
  const watchlists = await getWatchlists();
  const matches = watchlists.filter((wl) =>
    wl.enabled && wl.watchlist_rules?.length &&
    watchlistService.matchRelease(enriched, wl.watchlist_rules)
  );

  return NextResponse.json({
    message: matches.length > 0
      ? `Release matches ${matches.length} watchlist(s): ${matches.map((w) => w.name).join(", ")}`
      : "Release added to default EXTREME watchlist monitoring",
    matched: matches.map((w) => w.name),
    releaseId,
  });
}
