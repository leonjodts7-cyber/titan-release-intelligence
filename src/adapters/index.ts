import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";

export class TicketmasterAdapter extends BaseSourceAdapter {
  readonly name = "Ticketmaster";
  readonly config = {
    id: "ticketmaster",
    name: "Ticketmaster",
    sourceType: "mock",
    baseUrl: "https://www.ticketmaster.com",
    apiKeyEnv: "TICKETMASTER_API_KEY",
  };

  async fetch(): Promise<unknown> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { mock: true, message: "Set TICKETMASTER_API_KEY for live API" };
    }
    // Live: GET https://app.ticketmaster.com/discovery/v2/events.json?apikey=...
    return { mock: true };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    if ((raw as { mock?: boolean }).mock) {
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
          external_id: "tm-coldplay-wembley",
        },
      ];
    }
    return [];
  }
}

export class NikeAdapter extends BaseSourceAdapter {
  readonly name = "Nike SNKRS";
  readonly config = {
    id: "nike-snkrs",
    name: "Nike SNKRS",
    sourceType: "mock",
    baseUrl: "https://www.nike.com/launch",
    apiKeyEnv: "NIKE_API_KEY",
  };

  async fetch(): Promise<unknown> {
    return { mock: true, message: "Set NIKE_API_KEY for live API" };
  }

  async parse(): Promise<NormalizedRelease[]> {
    return [
      {
        title: "Nike Mercurial Superfly Limited",
        category_slug: "nike-football-boots",
        brand_slug: "nike",
        release_type: "product",
        status: "announced",
        official_url: "https://www.nike.com/launch/t/mercurial-limited",
        source_url: "https://www.nike.com/launch",
        release_starts_at: new Date(Date.now() + 86400000).toISOString(),
        price_min: 220,
        price_max: 220,
        currency: "EUR",
        stock_estimate: 5000,
        external_id: "nike-mercurial-limited",
      },
    ];
  }
}

export class AdidasAdapter extends BaseSourceAdapter {
  readonly name = "Adidas Confirmed";
  readonly config = {
    id: "adidas-confirmed",
    name: "Adidas Confirmed",
    sourceType: "mock",
    baseUrl: "https://www.adidas.com/confirmed",
    apiKeyEnv: "ADIDAS_API_KEY",
  };

  async fetch(): Promise<unknown> {
    return { mock: true };
  }

  async parse(): Promise<NormalizedRelease[]> {
    return [
      {
        title: "Adidas F50 Elite Limited",
        category_slug: "adidas-drops",
        brand_slug: "adidas",
        release_type: "product",
        status: "announced",
        official_url: "https://www.adidas.com/f50-limited",
        source_url: "https://www.adidas.com/confirmed",
        release_starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        price_min: 280,
        price_max: 280,
        currency: "EUR",
        external_id: "adidas-f50-limited",
      },
    ];
  }
}

export class UefaAdapter extends BaseSourceAdapter {
  readonly name = "UEFA";
  readonly config = { id: "uefa", name: "UEFA", sourceType: "mock", baseUrl: "https://www.uefa.com" };

  async fetch(): Promise<unknown> {
    return { mock: true };
  }

  async parse(): Promise<NormalizedRelease[]> {
    return [
      {
        title: "UEFA Champions League Final 2026",
        category_slug: "champions-league",
        league_slug: "uefa-champions-league",
        release_type: "ticket",
        status: "announced",
        official_url: "https://www.uefa.com/tickets",
        source_url: "https://www.uefa.com",
        release_starts_at: new Date(Date.now() + 120 * 86400000).toISOString(),
        price_min: 150,
        price_max: 800,
        currency: "EUR",
        external_id: "uefa-cl-final-2026",
      },
    ];
  }
}

export class NflAdapter extends BaseSourceAdapter {
  readonly name = "NFL";
  readonly config = { id: "nfl", name: "NFL", sourceType: "mock", baseUrl: "https://www.nfl.com" };

  async fetch(): Promise<unknown> {
    return { mock: true };
  }

  async parse(): Promise<NormalizedRelease[]> {
    return [
      {
        title: "Super Bowl LX Tickets",
        category_slug: "super-bowl",
        league_slug: "nfl",
        release_type: "ticket",
        status: "announced",
        official_url: "https://www.nfl.com/super-bowl/tickets",
        source_url: "https://www.nfl.com",
        release_starts_at: new Date(Date.now() + 180 * 86400000).toISOString(),
        price_min: 500,
        price_max: 5000,
        currency: "USD",
        external_id: "nfl-super-bowl-lx",
      },
    ];
  }
}

export class RssAdapter extends BaseSourceAdapter {
  readonly name = "RSS Feeds";
  readonly config = { id: "rss", name: "RSS Feeds", sourceType: "rss" };

  async fetch(): Promise<unknown> {
    return { items: [] };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    const items = (raw as { items?: Array<{ title: string; link: string; pubDate?: string }> }).items ?? [];
    return items.map((item) => ({
      title: item.title,
      release_type: "other" as const,
      status: "announced" as const,
      source_url: item.link,
      official_url: item.link,
      announced_at: item.pubDate,
    }));
  }
}

export class ManualAdapter extends BaseSourceAdapter {
  readonly name = "Manual Sources";
  readonly config = { id: "manual", name: "Manual Sources", sourceType: "manual" };

  async fetch(): Promise<unknown> {
    return { items: [] };
  }

  async parse(): Promise<NormalizedRelease[]> {
    return [];
  }
}

// Factory for all adapters
export function createAdapter(name: string): BaseSourceAdapter | null {
  const adapters: Record<string, () => BaseSourceAdapter> = {
    Ticketmaster: () => new TicketmasterAdapter(),
    "Nike SNKRS": () => new NikeAdapter(),
    "Adidas Confirmed": () => new AdidasAdapter(),
    UEFA: () => new UefaAdapter(),
    NFL: () => new NflAdapter(),
    "RSS Feeds": () => new RssAdapter(),
    "Manual Sources": () => new ManualAdapter(),
    LiveNation: () => new TicketmasterAdapter(),
    Eventim: () => new TicketmasterAdapter(),
    AXS: () => new TicketmasterAdapter(),
    FIFA: () => new UefaAdapter(),
    NBA: () => new NflAdapter(),
    "Premier League": () => new UefaAdapter(),
    "La Liga": () => new UefaAdapter(),
    "Formula 1": () => new UefaAdapter(),
    "Official Websites": () => new RssAdapter(),
  };
  const factory = adapters[name];
  return factory ? factory() : null;
}

export function getAllAdapterNames(): string[] {
  return [
    "Ticketmaster", "LiveNation", "Eventim", "AXS",
    "Nike SNKRS", "Adidas Confirmed",
    "UEFA", "FIFA", "NFL", "NBA", "Premier League", "La Liga", "Formula 1",
    "RSS Feeds", "Official Websites", "Manual Sources",
  ];
}
