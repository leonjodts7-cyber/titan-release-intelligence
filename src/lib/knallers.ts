import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropAt } from "@/lib/drop";
import { isUpcomingRelease } from "@/lib/drops/filter";

export function getKnallers(releases: EnrichedRelease[], now = new Date()): EnrichedRelease[] {
  return releases
    .filter((r) => {
      if (!isUpcomingRelease(r, now)) return false;
      const dropAt = getDropAt(r);
      if (!dropAt) return false;
      const ms = new Date(dropAt).getTime() - now.getTime();
      if (ms > 365 * 86400000) return false;
      const isTop = r.opportunity_action === "TOP OPPORTUNITY";
      const highScore = r.opportunity_score >= 90;
      return isTop || highScore;
    })
    .sort((a, b) => new Date(getDropAt(a)!).getTime() - new Date(getDropAt(b)!).getTime())
    .slice(0, 12);
}

export function quarterLabel(iso: string): string {
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

export function groupKnallersByQuarter(items: EnrichedRelease[]): [string, EnrichedRelease[]][] {
  const map = new Map<string, EnrichedRelease[]>();
  for (const r of items) {
    const at = getDropAt(r);
    if (!at) continue;
    const key = quarterLabel(at);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
