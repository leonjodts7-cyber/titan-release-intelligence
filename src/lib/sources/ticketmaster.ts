import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "./types";

const TM_COUNTRIES = ["BE", "NL", "DE", "FR", "GB"] as const;
const TM_SEGMENTS = ["Music", "Sports"] as const;
const CACHE_MS = 15 * 60 * 1000;
const PAGE_SIZE = 50;

let cache: { at: number; data: NormalizedRelease[] } | null = null;
let lastRequest = 0;

export interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  dates?: { start?: { dateTime?: string; localDate?: string; timezone?: string } };
  sales?: {
    public?: { startDateTime?: string; endDateTime?: string };
    presales?: Array<{ name?: string; startDateTime?: string; endDateTime?: string }>;
  };
  priceRanges?: Array<{ min: number; max: number; currency: string }>;
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { countryCode: string };
      capacity?: number;
    }>;
  };
}

async function rateLimit(): Promise<void> {
  const minGap = 220;
  const elapsed = Date.now() - lastRequest;
  if (elapsed < minGap) await new Promise((r) => setTimeout(r, minGap - elapsed));
  lastRequest = Date.now();
}

function subCategoryForEvent(event: TicketmasterEvent): string {
  const segment = event.classifications?.[0]?.segment?.name ?? "";
  if (segment === "Sports") {
    const genre = event.classifications?.[0]?.genre?.name?.toLowerCase() ?? "";
    if (/football|soccer|hockey|basketball|american football|baseball/.test(genre)) {
      if (/american football|basketball|baseball|hockey/.test(genre)) return "american-sports";
      return "football";
    }
    return "tennis-other";
  }
  const genre = event.classifications?.[0]?.genre?.name?.toLowerCase() ?? "";
  if (/festival/.test(genre) || /festival/i.test(event.name)) return "festivals";
  return "concerts";
}

function eventDateIso(event: TicketmasterEvent): string | undefined {
  const start = event.dates?.start?.dateTime ?? event.dates?.start?.localDate;
  if (!start) return undefined;
  const d = new Date(start);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function baseFields(event: TicketmasterEvent): Partial<NormalizedRelease> {
  const venue = event._embedded?.venues?.[0];
  const price = event.priceRanges?.[0];
  const sub = subCategoryForEvent(event);

  return {
    category_slug: sub === "festivals" ? "festivals" : "concert-tickets",
    release_type: "ticket",
    status: "announced",
    official_url: event.url,
    source_url: event.url,
    drop_timezone: event.dates?.start?.timezone ?? "Europe/Brussels",
    price_min: price?.min,
    price_max: price?.max,
    currency: price?.currency ?? "EUR",
    country_code: venue?.country?.countryCode,
    city_name: venue?.city?.name,
    venue_name: venue?.name,
    capacity_estimate: venue?.capacity,
    event_date: eventDateIso(event),
    main_category: "tickets",
    sub_category: sub,
    data_origin: "api",
    external_source: "ticketmaster",
    source_name: "Ticketmaster",
    source_checked_at: new Date().toISOString(),
    buy_locations: [
      {
        name: "Ticketmaster",
        type: "online",
        url: event.url,
        country: venue?.country?.countryCode ?? "BE",
      },
    ],
  };
}

/** Map one TM event to zero or more drop moments (presale + public sale). */
export function mapTicketmasterEventToDrops(event: TicketmasterEvent, now = Date.now()): NormalizedRelease[] {
  const base = baseFields(event);
  const drops: NormalizedRelease[] = [];
  const eventDate = base.event_date;

  const factualDesc = [
    event.name,
    venueLabel(base.venue_name, base.city_name),
    eventDate ? `event op ${formatDateShort(eventDate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  for (const [i, presale] of (event.sales?.presales ?? []).entries()) {
    if (!presale.startDateTime) continue;
    const dropAt = new Date(presale.startDateTime).toISOString();
    if (new Date(dropAt).getTime() <= now) continue;

    drops.push({
      title: `${event.name} — Voorverkoop${presale.name ? ` (${presale.name})` : ""}`,
      slug: `tm-${event.id}-presale-${i}`,
      ...base,
      description: `Ticketverkoop (voorverkoop) via Ticketmaster. ${factualDesc}.`,
      release_starts_at: dropAt,
      drop_at: dropAt,
      drop_time_confirmed: true,
      drop_event_type: "presale",
      presale_starts_at: dropAt,
      sale_type: "voorverkoop",
      external_source_id: `${event.id}-presale-${i}`,
    } as NormalizedRelease);
  }

  const publicStart = event.sales?.public?.startDateTime;
  if (publicStart) {
    const dropAt = new Date(publicStart).toISOString();
    if (new Date(dropAt).getTime() > now) {
      drops.push({
        title: `${event.name} — Algemene verkoop`,
        slug: `tm-${event.id}-public`,
        ...base,
        description: `Algemene ticketverkoop via Ticketmaster. ${factualDesc}.`,
        release_starts_at: dropAt,
        drop_at: dropAt,
        drop_time_confirmed: true,
        drop_event_type: "general_sale",
        general_sale_starts_at: dropAt,
        sale_type: "algemene_verkoop",
        external_source_id: `${event.id}-public`,
      } as NormalizedRelease);
    }
  }

  return drops;
}

/** @deprecated use mapTicketmasterEventToDrops */
export function mapTicketmasterEvent(event: TicketmasterEvent): NormalizedRelease {
  const drops = mapTicketmasterEventToDrops(event);
  return (
    drops[0] ?? {
      title: event.name,
      release_type: "ticket",
      status: "announced",
      source_url: event.url,
      official_url: event.url,
      external_source: "ticketmaster",
      external_source_id: event.id,
      data_origin: "api",
    }
  );
}

function venueLabel(venue?: string, city?: string): string | null {
  if (venue && city) return `${venue}, ${city}`;
  return venue ?? city ?? null;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-BE", {
    timeZone: "Europe/Brussels",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function fetchCountrySegment(
  apiKey: string,
  country: (typeof TM_COUNTRIES)[number],
  segment: (typeof TM_SEGMENTS)[number]
): Promise<NormalizedRelease[]> {
  const all: NormalizedRelease[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 5) {
    await rateLimit();
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("countryCode", country);
    url.searchParams.set("classificationName", segment);
    url.searchParams.set("size", String(PAGE_SIZE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "date,asc");
    url.searchParams.set("startDateTime", new Date().toISOString().replace(/\.\d{3}Z$/, "Z"));

    const res = await fetch(url.toString());
    if (!res.ok) break;

    const json = await res.json();
    const events = (json._embedded?.events ?? []) as TicketmasterEvent[];
    totalPages = json.page?.totalPages ?? 1;

    for (const event of events) {
      all.push(...mapTicketmasterEventToDrops(event));
    }
    page++;
  }

  return all;
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
      for (const segment of TM_SEGMENTS) {
        try {
          const batch = await fetchCountrySegment(apiKey, country, segment);
          all.push(...batch);
        } catch (err) {
          console.warn(`[ingest] Ticketmaster ${country}/${segment} mislukt:`, err);
        }
      }
    }

    cache = { at: Date.now(), data: all };
    return all;
  },
};
