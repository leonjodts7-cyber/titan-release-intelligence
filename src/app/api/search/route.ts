import { NextRequest, NextResponse } from "next/server";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases, globalSearch } from "@/lib/data/enrich-releases";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const releases = enrichReleases(await getReleases());
  const results = globalSearch(releases, q, 25).map((r) => ({
    id: r.id,
    title: r.title,
    category: r.release_categories?.name,
    type: r.release_type,
    opportunity_action: r.opportunity_action,
    opportunity_score: r.opportunity_score,
  }));
  return NextResponse.json({ results, query: q });
}
