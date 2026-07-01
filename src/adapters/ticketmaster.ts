import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";

const TM_KEYWORDS = ["concert", "music", "festival", "football", "sports"];
const TM_COUNTRIES = ["GB", "US", "NL", "BE", "DE"];

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  dates?: { start?: { dateTime?: string; localDate?: string } };
  priceRanges?: Array<{ min: number; max: number; currency: string }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { countryCode: string };
      capacity?: number;
    }>;
  };
}

export class TicketmasterAdapter extends BaseSourceAdapter {
  readonly name = "Ticketmaster";
  readonly config = {
    id: "ticketmaster",
    name: "Ticketmaster",
    sourceType: "api",
    baseUrl: "https://www.ticketmaster.com",
    apiKeyEnv: "TICKETMASTER_API_KEY",
  };

  constructor(record?: SourceAdapter) {
    super(record);
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.mode = "mock";
      this.log("warn", "No TICKETMASTER_API_KEY — using mock fallback");
      return { mock: true };
    }

    this.mode = "live";
    const country = TM_COUNTRIES[Math.floor(Math.random() * TM_COUNTRIES.length)];
    const keyword = TM_KEYWORDS[Math.floor(Math.random() * TM_KEYWORDS.length)];
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("countryCode", country);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("size", "20");
    url.searchParams.set("sort", "date,asc");

    this.log("info", `Fetching Ticketmaster events`, { country, keyword });

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      this.log("error", `Ticketmaster API error: ${res.status}`);
      throw new Error(`Ticketmaster API ${res.status}`);
    }
    return res.json();
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    if ((raw as { mock?: boolean }).mock) {
      return this.mockReleases();
    }

    const events = (raw as { _embedded?: { events?: TicketmasterEvent[] } })?._embedded?.events ?? [];
    this.log("info", `Parsed ${events.length} Ticketmaster events`);

    return events.map((event) => {
      const venue = event._embedded?.venues?.[0];
      const price = event.priceRanges?.[0];
      const startDate = event.dates?.start?.dateTime ?? event.dates?.start?.localDate;

      return {
        title: event.name,
        category_slug: "concert-tickets",
        release_type: "ticket" as const,
        status: "announced" as const,
        official_url: event.url,
        source_url: event.url,
        release_starts_at: startDate ? new Date(startDate).toISOString() : undefined,
        price_min: price?.min,
        price_max: price?.max,
        currency: price?.currency ?? "USD",
        capacity_estimate: venue?.capacity,
        country_code: venue?.country?.countryCode,
        city_name: venue?.city?.name,
        venue_name: venue?.name,
        external_id: `tm-${event.id}`,
      };
    });
  }

  private mockReleases(): NormalizedRelease[] {
    return [
      {
        title: "Coldplay - Wembley Stadium",
        category_slug: "concert-tickets",
        artist_slug: "coldplay",
        release_type: "ticket",
        status: "announced",
        official_url: "https://www.ticketmaster.co.uk/coldplay",
        source_url: "https://www.ticketmaster.com",
        release_starts_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        presale_starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        price_min: 75,
        price_max: 250,
        currency: "GBP",
        capacity_estimate: 90000,
        country_code: "GB",
        city_name: "London",
        venue_name: "Wembley Stadium",
        external_id: "tm-coldplay-wembley-mock",
      },
    ];
  }
}
