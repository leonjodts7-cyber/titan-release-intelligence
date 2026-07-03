import { readFileSync } from "fs";
import { join } from "path";
import type { NormalizedRelease, ReleaseStatus } from "@/types";
import type { MainCategory } from "@/lib/categories/taxonomy";
import type { SourceAdapter } from "./types";

export interface CuratedDropRow {
  name: string;
  main_category: MainCategory;
  sub_category: string;
  drop_at?: string | null;
  timezone: string;
  confirmed: boolean;
  retail_price_min?: number;
  retail_price_max?: number;
  currency: string;
  buy_locations: NormalizedRelease["buy_locations"];
  event_date?: string;
  event_venue?: string;
  event_city?: string;
  source_url: string;
  added_at: string;
  placeholder?: boolean;
  status?: ReleaseStatus;
  sale_label?: string;
  description?: string;
  _comment?: string;
}

export function loadCuratedDrops(): CuratedDropRow[] {
  const path = join(process.cwd(), "data", "curated-drops.json");
  const raw = JSON.parse(readFileSync(path, "utf-8")) as CuratedDropRow[];
  return raw.filter((row) => !row.placeholder && !row._comment);
}

export function curatedRowToRelease(row: CuratedDropRow): NormalizedRelease {
  const slug = row.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

  const isTicket = row.main_category === "tickets";
  const status = row.status ?? (row.drop_at ? "announced" : "on_sale");

  return {
    title: row.name,
    slug,
    release_type: isTicket ? "ticket" : row.main_category === "kaarten" ? "collectible" : "product",
    status,
    official_url: row.source_url,
    source_url: row.source_url,
    description: row.description ?? `${row.name} — gecureerde drop met bronvermelding.`,
    release_starts_at: row.drop_at ?? undefined,
    drop_at: row.drop_at ?? undefined,
    drop_time_confirmed: row.confirmed,
    drop_timezone: row.timezone,
    drop_event_type: isTicket && !row.drop_at ? undefined : row.drop_at ? "release" : undefined,
    price_min: row.retail_price_min ?? undefined,
    price_max: row.retail_price_max ?? undefined,
    currency: row.currency,
    buy_locations: row.buy_locations ?? [],
    venue_name: row.event_venue,
    city_name: row.event_city,
    event_date: row.event_date,
    main_category: row.main_category,
    sub_category: row.sub_category,
    data_origin: "curated",
    external_source: "curated",
    external_source_id: `curated-${slug}`,
    source_name: "Gecureerde bron",
    source_checked_at: row.added_at,
    sale_type: row.sale_label ? "algemene_verkoop" : undefined,
    hype_reason: row.sale_label ?? undefined,
  };
}

export const curatedAdapter: SourceAdapter = {
  id: "curated",
  name: "Gecureerde drops",

  async fetchReleases(): Promise<NormalizedRelease[]> {
    try {
      return loadCuratedDrops().map(curatedRowToRelease);
    } catch (err) {
      console.warn("[ingest] curated-drops.json niet gelezen:", err);
      return [];
    }
  },
};
