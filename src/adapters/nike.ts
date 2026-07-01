import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";

const NIKE_LAUNCH_URL = "https://www.nike.com/launch";

export class NikeAdapter extends BaseSourceAdapter {
  readonly name = "Nike SNKRS";
  readonly config = {
    id: "nike-snkrs",
    name: "Nike SNKRS",
    sourceType: "html",
    baseUrl: NIKE_LAUNCH_URL,
    apiKeyEnv: "NIKE_API_KEY",
  };

  constructor(record?: SourceAdapter) {
    super(record);
  }

  async fetch(): Promise<unknown> {
    const urls = this.getConfigUrls().length ? this.getConfigUrls() : [NIKE_LAUNCH_URL];

    // Nike has no public product API — monitor launch page (intelligence only, no checkout)
    this.mode = "live";
    const pages: Array<{ url: string; html: string }> = [];

    for (const url of urls) {
      try {
        this.log("info", `Monitoring Nike launch page: ${url}`);
        const res = await fetch(url, {
          headers: { "User-Agent": "TITAN-Release-Intelligence/1.0" },
          next: { revalidate: 0 },
        });
        if (res.ok) {
          pages.push({ url, html: await res.text() });
        } else {
          this.log("warn", `Nike page returned ${res.status}`);
        }
      } catch (err) {
        this.log("error", `Nike fetch failed`, { error: err instanceof Error ? err.message : "unknown" });
      }
    }

    if (!pages.length) {
      this.mode = "mock";
      this.log("warn", "Nike pages unreachable — mock fallback");
      return { mock: true };
    }

    return { pages };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    if ((raw as { mock?: boolean }).mock) {
      return this.mockReleases();
    }

    const pages = (raw as { pages?: Array<{ url: string; html: string }> }).pages ?? [];
    const releases: NormalizedRelease[] = [];

    for (const { url, html } of pages) {
      const productLinks = this.extractProductLinks(html, url);

      for (const link of productLinks.slice(0, 10)) {
        releases.push({
          title: link.title,
          category_slug: "nike-drops",
          brand_slug: "nike",
          release_type: "product",
          status: "announced",
          official_url: link.url,
          source_url: url,
          external_id: `nike-${link.slug}`,
        });
      }

      if (!productLinks.length) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          releases.push({
            title: titleMatch[1].trim(),
            category_slug: "nike-drops",
            brand_slug: "nike",
            release_type: "product",
            status: "announced",
            official_url: url,
            source_url: url,
            external_id: `nike-page-${Date.now()}`,
          });
        }
      }
    }

    if (!releases.length) {
      this.mode = "mock";
      return this.mockReleases();
    }

    return releases;
  }

  private extractProductLinks(html: string, baseUrl: string): Array<{ title: string; url: string; slug: string }> {
    const links: Array<{ title: string; url: string; slug: string }> = [];
    const regex = /href="(\/launch\/t\/[^"]+)"[^>]*>([^<]+)</gi;
    let match;
    while ((match = regex.exec(html)) !== null && links.length < 15) {
      const path = match[1];
      const title = match[2].trim();
      if (title.length > 3) {
        links.push({
          title,
          url: `https://www.nike.com${path}`,
          slug: path.split("/").pop() ?? title.toLowerCase().replace(/\s+/g, "-"),
        });
      }
    }
    return links;
  }

  private mockReleases(): NormalizedRelease[] {
    return [{
      title: "Nike Mercurial Superfly Limited",
      category_slug: "nike-football-boots",
      brand_slug: "nike",
      release_type: "product",
      status: "announced",
      official_url: "https://www.nike.com/launch/t/mercurial-limited",
      source_url: NIKE_LAUNCH_URL,
      release_starts_at: new Date(Date.now() + 86400000).toISOString(),
      price_min: 220,
      price_max: 220,
      currency: "EUR",
      stock_estimate: 5000,
      external_id: "nike-mercurial-mock",
    }];
  }
}
