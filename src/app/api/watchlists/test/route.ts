import { NextRequest, NextResponse } from "next/server";
import { watchlistService } from "@/services/watchlist.service";
import { getMockReleases } from "@/lib/data/releases";

const WATCHLIST_RULES: Record<string, Array<{ field: string; operator: "equals" | "contains" | "gte" | "lte" | "within_days"; value: string }>> = {
  "1": [{ field: "brand", operator: "equals", value: "Nike" }],
  "2": [{ field: "league", operator: "contains", value: "Champions League" }],
  "3": [{ field: "priority_level", operator: "equals", value: "EXTREME" }],
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const watchlistId = body.watchlistId ?? "1";
  const rules = WATCHLIST_RULES[watchlistId] ?? WATCHLIST_RULES["1"];

  const releases = getMockReleases();
  const matches = releases.filter((r) =>
    watchlistService.matchRelease(r, rules.map((rule, i) => ({
      id: String(i),
      watchlist_id: watchlistId,
      ...rule,
      created_at: new Date().toISOString(),
    })))
  );

  const testRelease = releases[0];
  const testResult = watchlistService.testRules(
    testRelease,
    rules.map((rule, i) => ({
      id: String(i),
      watchlist_id: watchlistId,
      ...rule,
      created_at: new Date().toISOString(),
    }))
  );

  return NextResponse.json({
    message: `Watchlist matched ${matches.length} of ${releases.length} releases`,
    matches: matches.map((r) => r.title),
    testOn: testRelease.title,
    details: testResult.details,
    matched: testResult.matched,
  });
}
