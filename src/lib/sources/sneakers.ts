import { readFileSync } from "fs";
import { join } from "path";
import type { NormalizedRelease, BuyLocation } from "@/types";
import type { SourceAdapter } from "./types";

interface SneakerJsonRow {
  title: string;
  category_slug: string;
  release_type: NormalizedRelease["release_type"];
  daysFromNow: number;
  dropHour: number;
  dropMinute?: number;
  price_min: number;
  price_max: number;
  currency: string;
  sale_type?: NormalizedRelease["sale_type"];
  buy_locations: BuyLocation[];
  description?: string;
}

function brusselsDropAt(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour - 2, minute)).toISOString();
}

export const sneakersAdapter: SourceAdapter = {
  id: "sneakers",
  name: "Sneaker kalender",

  async fetchReleases(): Promise<NormalizedRelease[]> {
    try {
      const path = join(process.cwd(), "data", "sneaker-releases.json");
      const rows = JSON.parse(readFileSync(path, "utf-8")) as SneakerJsonRow[];
      const now = Date.now();

      return rows
        .map((row, i) => {
          const dropAt = brusselsDropAt(row.daysFromNow, row.dropHour, row.dropMinute ?? 0);
          return {
            title: row.title,
            category_slug: row.category_slug,
            release_type: row.release_type,
            status: "announced" as const,
            official_url: row.buy_locations[0]?.url,
            source_url: row.buy_locations[0]?.url ?? "https://sneaker-calendar.local",
            release_starts_at: dropAt,
            drop_at: dropAt,
            drop_time_confirmed: true,
            drop_timezone: "Europe/Amsterdam",
            price_min: row.price_min,
            price_max: row.price_max,
            currency: row.currency,
            sale_type: row.sale_type ?? "drop",
            buy_locations: row.buy_locations,
            description: row.description ?? `Sneaker drop via ${row.buy_locations[0]?.name ?? "officiële retailer"}.`,
            external_source: "sneaker-calendar",
            external_source_id: `sneaker-${i}-${row.title.toLowerCase().replace(/\s+/g, "-")}`,
            source_name: "Sneaker kalender",
            source_checked_at: new Date().toISOString(),
          } satisfies NormalizedRelease;
        })
        .filter((r) => r.drop_at && new Date(r.drop_at).getTime() > now);
    } catch (err) {
      console.warn("[ingest] sneaker-releases.json niet gelezen:", err);
      return [];
    }
  },
};
