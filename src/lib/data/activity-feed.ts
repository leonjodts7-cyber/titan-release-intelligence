import { getScanJobs } from "@/lib/data/sources";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";

export type ActivityType = "scan" | "update" | "resale" | "new" | "ai" | "drop";

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  source: string;
  type: ActivityType;
  headline: string;
  detail?: string;
  release_id?: string;
  importance: number;
}

function resolveFeedSource(release: { brands?: { name: string } | null; tcg_name?: string | null; release_type?: string }): string {
  const brand = release.brands?.name;
  if (brand === "Nike" || brand === "Jordan") return "Nike SNKRS";
  if (brand === "Adidas") return "Adidas Confirmed";
  if (release.tcg_name) return "TCGplayer";
  if (release.release_type === "ticket") return "Ticketmaster";
  return "StockX";
}

export async function getActivityFeed(limit = 40): Promise<ActivityFeedItem[]> {
  const [scans, releases] = await Promise.all([
    getScanJobs(12),
    enrichReleases(await getReleases({ limit: 20 })),
  ]);

  const now = Date.now();
  const items: ActivityFeedItem[] = [];

  scans.forEach((s, i) => {
    items.push({
      id: `scan-${s.id}`,
      timestamp: s.started_at ?? new Date(now - i * 60000).toISOString(),
      source: s.source_adapters?.name ?? "Scanner",
      type: "scan",
      headline: s.status === "failed" ? "Scan failed" : "Scan completed",
      detail: `Found ${s.items_found}, +${s.items_created} new, ${s.items_updated} updated`,
      importance: s.status === "failed" ? 90 : 50,
    });
  });

  releases.slice(0, 8).forEach((r, i) => {
    items.push({
      id: `upd-${r.id}`,
      timestamp: r.last_changed_at ?? new Date(now - (i + 2) * 90000).toISOString(),
      source: resolveFeedSource(r),
      type: "update",
      headline: `${r.title.split("—")[0].trim()} bijgewerkt`,
      detail: `Opportunity ${r.opportunity_score} · ${r.opportunity_action}`,
      release_id: r.id,
      importance: r.opportunity_score,
    });
  });

  const resaleHits = releases.filter((r) => (r.expected_roi_mid ?? 0) > 50).slice(0, 4);
  resaleHits.forEach((r, i) => {
    items.push({
      id: `resale-${r.id}`,
      timestamp: new Date(now - (i + 5) * 120000).toISOString(),
      source: "StockX",
      type: "resale",
      headline: `${r.brands?.name ?? r.title.split(" ")[0]} resale +${Math.round((r.expected_roi_mid ?? 0) / 10)}%`,
      release_id: r.id,
      importance: 75,
    });
  });

  const tcg = releases.filter((r) => r.tcg_name).slice(0, 3);
  tcg.forEach((r, i) => {
    items.push({
      id: `tcg-${r.id}`,
      timestamp: new Date(now - (i + 8) * 150000).toISOString(),
      source: r.tcg_name ?? "Pokémon",
      type: "new",
      headline: `New ${r.product_type_tcg ?? "product"}: ${r.title.split("—").pop()?.trim() ?? r.title}`,
      release_id: r.id,
      importance: 80,
    });
  });

  items.push({
    id: "ai-1",
    timestamp: new Date(now - 180000).toISOString(),
    source: "AI",
    type: "ai",
    headline: "Opportunity scores recalculated",
    detail: `${releases.filter((r) => r.opportunity_action === "TOP OPPORTUNITY" || r.opportunity_action === "MUST WATCH").length} critical opportunities`,
    importance: 85,
  });

  const nike = releases.find((r) => r.brands?.name === "Nike" || r.brands?.name === "Jordan");
  if (nike) {
    items.push({
      id: "drop-nike",
      timestamp: new Date(now - 240000).toISOString(),
      source: "Nike SNKRS",
      type: "drop",
      headline: "Drop gedetecteerd",
      detail: nike.title,
      release_id: nike.id,
      importance: 88,
    });
  }

  return dedupeAndGroupFeed(
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  ).slice(0, limit);
}

function dedupeAndGroupFeed(items: ActivityFeedItem[]): ActivityFeedItem[] {
  const seen = new Set<string>();
  const out: ActivityFeedItem[] = [];

  for (const item of items) {
    const key = `${item.type}:${item.headline}:${item.release_id ?? ""}`;
    if (item.type !== "scan" && seen.has(key)) continue;
    seen.add(key);

    if (item.type === "scan" && item.headline === "Scan completed") {
      const existing = out.find((o) => o.type === "scan" && o.headline.startsWith("Scan completed") && o.source === item.source);
      if (existing) {
        const match = existing.headline.match(/^(\d+)x /);
        const count = match ? parseInt(match[1], 10) + 1 : 2;
        existing.headline = `${count}x scan completed`;
        existing.timestamp = item.timestamp;
        continue;
      }
    }

    out.push({ ...item });
  }

  return out;
}
