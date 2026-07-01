import type { NormalizedRelease } from "@/types";
import { slugify } from "@/lib/utils";

export class NormalizerService {
  normalize(item: NormalizedRelease): NormalizedRelease {
    return {
      ...item,
      title: this.cleanTitle(item.title),
      slug: item.slug ?? slugify(item.title),
      status: item.status ?? "announced",
      release_type: item.release_type ?? "other",
      currency: item.currency ?? "EUR",
      timezone: item.timezone ?? "UTC",
      source_url: item.source_url.trim(),
      official_url: item.official_url?.trim(),
    };
  }

  normalizeAll(items: NormalizedRelease[]): NormalizedRelease[] {
    return items.map((item) => this.normalize(item));
  }

  private cleanTitle(title: string): string {
    return title.replace(/\s+/g, " ").trim();
  }
}

export const normalizerService = new NormalizerService();
