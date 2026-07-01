import type { NormalizedRelease } from "@/types";
import { slugify } from "@/lib/utils";

interface ExistingRelease {
  id: string;
  slug: string;
  title: string;
  external_id?: string | null;
}

export class DeduplicationService {
  findDuplicate(
    incoming: NormalizedRelease,
    existing: ExistingRelease[]
  ): ExistingRelease | null {
    if (incoming.external_id) {
      const byExternal = existing.find((e) => e.external_id === incoming.external_id);
      if (byExternal) return byExternal;
    }

    const slug = incoming.slug ?? slugify(incoming.title);
    const bySlug = existing.find((e) => e.slug === slug);
    if (bySlug) return bySlug;

    const normalizedTitle = incoming.title.toLowerCase().trim();
    const byTitle = existing.find(
      (e) => e.title.toLowerCase().trim() === normalizedTitle
    );
    if (byTitle) return byTitle;

    return null;
  }

  deduplicateBatch(
    incoming: NormalizedRelease[],
    existing: ExistingRelease[]
  ): { unique: NormalizedRelease[]; duplicates: NormalizedRelease[] } {
    const unique: NormalizedRelease[] = [];
    const duplicates: NormalizedRelease[] = [];
    const seen = new Set<string>();

    for (const item of incoming) {
      const slug = item.slug ?? slugify(item.title);
      if (seen.has(slug)) {
        duplicates.push(item);
        continue;
      }

      const existingMatch = this.findDuplicate(item, existing);
      if (existingMatch) {
        duplicates.push(item);
        continue;
      }

      seen.add(slug);
      unique.push(item);
    }

    return { unique, duplicates };
  }
}

export const deduplicationService = new DeduplicationService();
