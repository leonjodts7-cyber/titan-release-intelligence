import type { NormalizedRelease } from "@/types";

export class EnrichmentService {
  enrich(item: NormalizedRelease): NormalizedRelease {
    const enriched = { ...item };

    if (!enriched.category_slug) {
      enriched.category_slug = this.inferCategory(item.title, item.release_type);
    }

    if (!enriched.brand_slug) {
      enriched.brand_slug = this.inferBrand(item.title);
    }

    if (!enriched.artist_slug) {
      enriched.artist_slug = this.inferArtist(item.title);
    }

    if (!enriched.league_slug) {
      enriched.league_slug = this.inferLeague(item.title);
    }

    return enriched;
  }

  enrichAll(items: NormalizedRelease[]): NormalizedRelease[] {
    return items.map((item) => this.enrich(item));
  }

  private inferCategory(title: string, type: string): string | undefined {
    const t = title.toLowerCase();
    if (t.includes("super bowl")) return "super-bowl";
    if (t.includes("champions league")) return "champions-league";
    if (t.includes("premier league")) return "premier-league";
    if (t.includes("tomorrowland") || t.includes("festival")) return "festivals";
    if (t.includes("mercurial") || t.includes("phantom") || t.includes("football boot")) return "nike-football-boots";
    if (t.includes("nike") || t.includes("jordan") || t.includes("travis scott")) return "nike-drops";
    if (t.includes("adidas") || t.includes("f50")) return "adidas-drops";
    if (t.includes("formula 1") || t.includes("grand prix")) return "sport-tickets";
    if (type === "ticket") return "concert-tickets";
    if (type === "product") return "limited-sneakers";
    return undefined;
  }

  private inferBrand(title: string): string | undefined {
    const t = title.toLowerCase();
    if (t.includes("jordan") || t.includes("travis scott")) return "jordan";
    if (t.includes("nike")) return "nike";
    if (t.includes("adidas")) return "adidas";
    return undefined;
  }

  private inferArtist(title: string): string | undefined {
    const t = title.toLowerCase();
    if (t.includes("coldplay")) return "coldplay";
    if (t.includes("taylor swift")) return "taylor-swift";
    if (t.includes("travis scott")) return "travis-scott";
    return undefined;
  }

  private inferLeague(title: string): string | undefined {
    const t = title.toLowerCase();
    if (t.includes("champions league") || t.includes("uefa")) return "uefa-champions-league";
    if (t.includes("super bowl") || t.includes("nfl")) return "nfl";
    if (t.includes("premier league")) return "premier-league";
    if (t.includes("formula 1")) return "formula-1";
    return undefined;
  }
}

export const enrichmentService = new EnrichmentService();
