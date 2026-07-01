import type { NormalizedRelease } from "@/types";
import { slugify } from "@/lib/utils";

export class ParserService {
  parseHtml(html: string, sourceUrl: string): NormalizedRelease[] {
    const releases: NormalizedRelease[] = [];
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      releases.push({
        title: titleMatch[1].trim(),
        release_type: "other",
        status: "announced",
        source_url: sourceUrl,
        official_url: sourceUrl,
      });
    }
    return releases;
  }

  parseRss(xml: string): NormalizedRelease[] {
    const items: NormalizedRelease[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1];
      const link = block.match(/<link>(.*?)<\/link>/i)?.[1];
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1];
      if (title && link) {
        items.push({
          title: title.trim(),
          release_type: "other",
          status: "announced",
          source_url: link.trim(),
          official_url: link.trim(),
          announced_at: pubDate ? new Date(pubDate).toISOString() : undefined,
        });
      }
    }
    return items;
  }

  parseJson(data: unknown, sourceUrl: string): NormalizedRelease[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: Record<string, unknown>) => ({
      title: String(item.title ?? item.name ?? "Unknown"),
      slug: slugify(String(item.title ?? item.name ?? "unknown")),
      release_type: (item.type as NormalizedRelease["release_type"]) ?? "other",
      status: "announced",
      source_url: sourceUrl,
      official_url: String(item.url ?? item.link ?? sourceUrl),
      release_starts_at: item.date ? new Date(String(item.date)).toISOString() : undefined,
      price_min: typeof item.price === "number" ? item.price : undefined,
    }));
  }
}

export const parserService = new ParserService();
