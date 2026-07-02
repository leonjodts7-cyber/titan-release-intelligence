import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "./types";

const TM_COUNTRIES = ["BE", "NL", "DE", "FR", "GB"] as const;
const CACHE_MS = 15 * 60 * 1000;
let cache: { at: number; data: NormalizedRelease[] } | null = null;
let lastRequest = 0;

async function rateLimit(): Promise<void> {
  const minGap = 200; // max 5 req/s
  const elapsed = Date.now() - lastRequest;
  if (elapsed < minGap) await new Promise((r) => setTimeout(r, minGap - elapsed));
  lastRequest = Date.now();
}

export function mapTicketmasterEvent(event: {
  id: string;
  name: string;
  url: string;
  dates?: { start?: { dateTime?: string; localDate?: string } };
  sales?: { public?: { startDateTime?: string }; presales?: Array<{ startDateTime?: string }> };
  priceRanges?: Array<{ min: number; max: number; currency: string }>;
  _embedded?: { venues?: Array<{ name: string; city?: { name: string }; country?: { countryCode: string } }> };
}): NormalizedRelease {
  const venue = event._embedded?.venues?.[0];
  const price = event.priceRanges?.[0];
  const start = event.dates?.start?.dateTime ?? event.dates?.start?.localDate;
  const presale = event.sales?.presales?.[0]?.startDateTime;
  const dropAt = start ? new Date(start).toISOString() : undefined;

  return {
    title: event.name,
    category_slug: "concert-tickets",
    release_type: "ticket",
    status: "announced",
    official_url: event.url,
    source_url: event.url,
    release_starts_at: dropAt,
    drop_at: dropAt,
    drop_time_confirmed: Boolean(event.dates?.start?.dateTime),
    drop_timezone: "Europe/Brussels",
    presale_starts_at: presale ? new Date(presale).toISOString() : undefined,
    general_sale_starts_at: event.sales?.public?.startDateTime
      ? new Date(event.sales.public.startDateTime).toISOString()
      : undefined,
    price_min: price?.min,
    price_max: price?.max,
    currency: price?.currency ?? "EUR",
    country_code: venue?.country?.countryCode,
    city_name: venue?.city?.name,
    venue_name: venue?.name,
    external_source: "ticketmaster",
    external_source_id: event.id,
    source_name: "Ticketmaster",
    source_checked_at: new Date().toISOString(),
    sale_type: "voorverkoop",
    buy_locations: [
      {
        name: "Ticketmaster",
        type: "online",
        url: event.url,
        country: venue?.country?.countryCode ?? "BE",
      },
    ],
    description: `Officieel event via Ticketmaster${venue?.name ? ` — ${venue.name}` : ""}.`,
  };
}

export const ticketmasterAdapter: SourceAdapter = {
  id: "ticketmaster",
  name: "Ticketmaster",

  async fetchReleases(): Promise<NormalizedRelease[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY?.trim();
    if (!apiKey) {
      console.warn("[ingest] TICKETMASTER_API_KEY ontbreekt — adapter overgeslagen");
      return [];
    }

    if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

    const all: NormalizedRelease[] = [];

    for (const country of TM_COUNTRIES) {
      await rateLimit();
      const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("countryCode", country);
      url.searchParams.set("size", "20");
      url.searchParams.set("sort", "date,asc");
      url.searchParams.set("startDateTime", new Date().toISOString().replace(/\.\d{3}Z$/, "Z"));

      try {
        const res = await fetch(url.toString());
        if (!res.ok) continue;
        const json = await res.json();
        const events = json._embedded?.events ?? [];
        for (const e of events) {
          const mapped = mapTicketmasterEvent(e);
          if (mapped.drop_at && new Date(mapped.drop_at).getTime() > Date.now()) {
            all.push(mapped);
          }
        }
      } catch (err) {
        console.warn(`[ingest] Ticketmaster ${country} mislukt:`, err);
      }
    }

    cache = { at: Date.now(), data: all };
    return all;
  },
};
