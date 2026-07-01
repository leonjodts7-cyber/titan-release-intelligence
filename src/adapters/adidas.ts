import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";

const ADIDAS_CONFIRMED_URL = "https://www.adidas.com/us/confirmed";

export class AdidasAdapter extends BaseSourceAdapter {
  readonly name = "Adidas Confirmed";
  readonly config = {
    id: "adidas-confirmed",
    name: "Adidas Confirmed",
    sourceType: "html",
    baseUrl: ADIDAS_CONFIRMED_URL,
    apiKeyEnv: "ADIDAS_API_KEY",
  };

  constructor(record?: SourceAdapter) {
    super(record);
  }

  async fetch(): Promise<unknown> {
    const urls = this.getConfigUrls().length ? this.getConfigUrls() : [ADIDAS_CONFIRMED_URL];

    this.mode = "live";
    for (const url of urls) {
      try {
        this.log("info", `Monitoring Adidas page: ${url}`);
        const res = await fetch(url, {
          headers: { "User-Agent": "TITAN-Release-Intelligence/1.0" },
          next: { revalidate: 0 },
        });
        if (res.ok) {
          return { url, html: await res.text() };
        }
        this.log("warn", `Adidas page returned ${res.status}`);
      } catch (err) {
        this.log("error", `Adidas fetch failed`, { error: err instanceof Error ? err.message : "unknown" });
      }
    }

    this.mode = "mock";
    this.log("warn", "Adidas pages unreachable — mock fallback");
    return { mock: true };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    if ((raw as { mock?: boolean }).mock) {
      return [{
        title: "Adidas F50 Elite Limited",
        category_slug: "adidas-drops",
        brand_slug: "adidas",
        release_type: "product",
        status: "announced",
        official_url: "https://www.adidas.com/f50-limited",
        source_url: ADIDAS_CONFIRMED_URL,
        release_starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        price_min: 280,
        price_max: 280,
        currency: "EUR",
        external_id: "adidas-f50-mock",
      }];
    }

    const { url, html } = raw as { url: string; html: string };
    const releases: NormalizedRelease[] = [];
    const productRegex = /"productName":"([^"]+)"/gi;
    let match;
    while ((match = productRegex.exec(html)) !== null && releases.length < 10) {
      releases.push({
        title: match[1],
        category_slug: "adidas-drops",
        brand_slug: "adidas",
        release_type: "product",
        status: "announced",
        official_url: url,
        source_url: url,
        external_id: `adidas-${match[1].toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`,
      });
    }

    if (!releases.length) {
      this.mode = "mock";
      return this.parse({ mock: true });
    }

    return releases;
  }
}
