import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";

interface SportSourceConfig {
  monitor_urls: string[];
  category_slug: string;
  league_slug?: string;
  release_type?: "ticket";
}

const SPORT_DEFAULTS: Record<string, SportSourceConfig> = {
  UEFA: {
    monitor_urls: ["https://www.uefa.com/tickets/"],
    category_slug: "champions-league",
    league_slug: "uefa-champions-league",
  },
  FIFA: {
    monitor_urls: ["https://www.fifa.com/tickets"],
    category_slug: "football-matches",
    league_slug: "uefa-champions-league",
  },
  NFL: {
    monitor_urls: ["https://www.nfl.com/super-bowl/tickets"],
    category_slug: "super-bowl",
    league_slug: "nfl",
  },
  NBA: {
    monitor_urls: ["https://www.nba.com/tickets"],
    category_slug: "sport-tickets",
  },
  "Premier League": {
    monitor_urls: ["https://www.premierleague.com/tickets"],
    category_slug: "premier-league",
    league_slug: "premier-league",
  },
  "La Liga": {
    monitor_urls: ["https://www.laliga.com/en-GB/tickets"],
    category_slug: "football-matches",
  },
  "Formula 1": {
    monitor_urls: ["https://www.formula1.com/en/tickets.html"],
    category_slug: "sport-tickets",
    league_slug: "formula-1",
  },
};

export class SportsAdapter extends BaseSourceAdapter {
  readonly name: string;
  readonly config;
  private sportConfig: SportSourceConfig;

  constructor(name: string, record?: SourceAdapter) {
    super(record);
    this.name = name;
    this.sportConfig = {
      ...SPORT_DEFAULTS[name],
      ...(record?.config as unknown as SportSourceConfig),
    };
    this.config = {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      sourceType: "html",
      baseUrl: this.sportConfig.monitor_urls[0],
    };
  }

  async fetch(): Promise<unknown> {
    const urls = this.getConfigUrls().length ? this.getConfigUrls() : this.sportConfig.monitor_urls;

    this.mode = "live";
    for (const url of urls) {
      try {
        this.log("info", `Monitoring official URL: ${url}`);
        const res = await fetch(url, {
          headers: { "User-Agent": "TITAN-Release-Intelligence/1.0" },
          next: { revalidate: 0 },
        });
        if (res.ok) {
          return { url, html: await res.text(), status: res.status };
        }
        this.log("warn", `Official page returned ${res.status}: ${url}`);
      } catch (err) {
        this.log("error", `Official URL fetch failed: ${url}`);
      }
    }

    this.mode = "mock";
    this.log("warn", `${this.name} official URLs unreachable — mock fallback`);
    return { mock: true };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    if ((raw as { mock?: boolean }).mock) {
      return this.mockReleases();
    }

    const { url, html } = raw as { url: string; html: string };
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = h1Match?.[1]?.trim() ?? titleMatch?.[1]?.trim() ?? `${this.name} Tickets`;

    return [{
      title: `${this.name}: ${title}`.slice(0, 120),
      category_slug: this.sportConfig.category_slug,
      league_slug: this.sportConfig.league_slug,
      release_type: "ticket",
      status: "announced",
      official_url: url,
      source_url: url,
      external_id: `${this.config.id}-official-monitor`,
      description: `Official ticket page monitored for ${this.name}`,
    }];
  }

  private mockReleases(): NormalizedRelease[] {
    const mocks: Record<string, NormalizedRelease> = {
      UEFA: {
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
        external_id: "uefa-cl-mock",
      },
      NFL: {
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
        external_id: "nfl-sb-mock",
      },
    };

    return [mocks[this.name] ?? {
      title: `${this.name} Ticket Release`,
      category_slug: this.sportConfig.category_slug,
      league_slug: this.sportConfig.league_slug,
      release_type: "ticket",
      status: "announced",
      official_url: this.sportConfig.monitor_urls[0],
      source_url: this.sportConfig.monitor_urls[0],
      external_id: `${this.config.id}-mock`,
    }];
  }
}
