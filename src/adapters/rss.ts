import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";
import { parserService } from "@/services/parser.service";

const DEFAULT_FEEDS = [
  "https://www.nike.com/feed/snkrs.xml",
  "https://www.football365.com/feed",
];

export class RssAdapter extends BaseSourceAdapter {
  readonly name: string;
  readonly config;

  constructor(record?: SourceAdapter) {
    super(record);
    this.name = record?.name ?? "RSS Feeds";
    this.config = {
      id: "rss",
      name: this.name,
      sourceType: "rss",
      baseUrl: record?.base_url ?? undefined,
    };
  }

  private getFeedUrls(): string[] {
    const envFeeds = process.env.RSS_FEED_URLS?.split(",").map((u) => u.trim()).filter(Boolean);
    if (envFeeds?.length) return envFeeds;

    const configFeeds = (this.record?.config as { feeds?: string[] })?.feeds;
    if (configFeeds?.length) return configFeeds;

    return DEFAULT_FEEDS;
  }

  async fetch(): Promise<unknown> {
    const feeds = this.getFeedUrls();
    if (!feeds.length) {
      this.mode = "mock";
      this.log("warn", "No RSS feeds configured — mock mode");
      return { mock: true, items: [] };
    }

    this.mode = "live";
    const results: Array<{ feed: string; xml: string }> = [];

    for (const feedUrl of feeds) {
      try {
        this.log("info", `Fetching RSS feed: ${feedUrl}`);
        const res = await fetch(feedUrl, {
          headers: { "User-Agent": "TITAN-Release-Intelligence/1.0" },
          next: { revalidate: 0 },
        });
        if (res.ok) {
          const xml = await res.text();
          results.push({ feed: feedUrl, xml });
        } else {
          this.log("warn", `Feed returned ${res.status}: ${feedUrl}`);
        }
      } catch (err) {
        this.log("error", `Failed to fetch feed: ${feedUrl}`, {
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    if (!results.length) {
      this.mode = "mock";
      this.log("warn", "All RSS feeds failed — mock fallback");
      return { mock: true };
    }

    return { feeds: results };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    if ((raw as { mock?: boolean }).mock) {
      return [{
        title: "RSS Feed Monitor Active",
        release_type: "other",
        status: "announced",
        source_url: "https://titan.local/rss",
        official_url: "https://titan.local/rss",
        description: "Configure RSS_FEED_URLS in .env.local for live feeds",
        external_id: "rss-monitor-mock",
      }];
    }

    const feeds = (raw as { feeds?: Array<{ feed: string; xml: string }> }).feeds ?? [];
    const releases: NormalizedRelease[] = [];

    for (const { feed, xml } of feeds) {
      const items = parserService.parseRss(xml);
      for (const item of items) {
        releases.push({
          ...item,
          source_url: item.source_url || feed,
          external_id: `rss-${Buffer.from(item.title).toString("base64url").slice(0, 16)}`,
        });
      }
    }

    this.log("info", `Parsed ${releases.length} items from ${feeds.length} feeds`);
    return releases.slice(0, 30);
  }
}
