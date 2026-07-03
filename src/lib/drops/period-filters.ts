import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropAt } from "@/lib/drop";
import { isWithinDays, isTodayOrTomorrow } from "@/lib/tiers";

export function filterUpcoming(releases: EnrichedRelease[], now = new Date()): EnrichedRelease[] {
  return releases.filter((r) => {
    const at = getDropAt(r);
    return at && new Date(at).getTime() > now.getTime() - 3600_000;
  });
}

export function filterTodayTomorrow(releases: EnrichedRelease[], now = new Date()): EnrichedRelease[] {
  return releases.filter((r) => isTodayOrTomorrow(getDropAt(r), now));
}

export function filterThisWeek(releases: EnrichedRelease[], now = new Date()): EnrichedRelease[] {
  return releases.filter((r) => isWithinDays(getDropAt(r), 7, now));
}

export function filterLaterThisYear(releases: EnrichedRelease[], now = new Date()): EnrichedRelease[] {
  return releases.filter((r) => {
    const at = getDropAt(r);
    if (!at) return false;
    const t = new Date(at).getTime();
    return t > now.getTime() + 7 * 86400000;
  });
}

export function topTierWithinWeek(releases: EnrichedRelease[], limit = 3, now = new Date()): EnrichedRelease[] {
  return filterThisWeek(releases, now)
    .filter((r) => r.opportunity_action === "TOP OPPORTUNITY" || r.opportunity_action === "MUST WATCH")
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, limit);
}

export function topTierLaterYear(releases: EnrichedRelease[], limit = 3, now = new Date()): EnrichedRelease[] {
  return filterLaterThisYear(releases, now)
    .filter((r) => r.opportunity_action === "TOP OPPORTUNITY" || r.opportunity_action === "MUST WATCH")
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, limit);
}
