import { NextResponse } from "next/server";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";

export async function GET() {
  const releases = enrichReleases(await getReleases());

  const headers = [
    "id", "title", "category", "priority", "opportunity_action", "opportunity_score",
    "retail_min", "retail_max", "currency", "resale_low", "resale_mid", "resale_high",
    "profit_mid", "roi_mid", "liquidity", "confidence", "release_starts_at", "official_url",
  ];

  const rows = releases.map((r) => [
    r.id, r.title, r.release_categories?.name ?? "", r.priority_level, r.opportunity_action,
    r.opportunity_score, r.price_min, r.price_max, r.currency,
    r.estimated_resale_low, r.estimated_resale_mid, r.estimated_resale_high,
    r.expected_profit_mid, r.expected_roi_mid, r.market_liquidity_score, r.resale_confidence_score,
    r.release_starts_at, r.official_url,
  ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="titan-opportunities-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
