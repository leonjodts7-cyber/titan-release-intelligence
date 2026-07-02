import type { Release } from "@/types";
import { getDropAt } from "@/lib/drop";
import { DISPLAY_TZ } from "@/lib/time";

/** Now in Europe/Brussels — single reference for drop comparisons. */
export function nowInBrussels(): Date {
  return new Date();
}

export function isUpcomingRelease(release: Release, now = new Date()): boolean {
  const dropAt = getDropAt(release);
  if (!dropAt) return false;
  if (release.status === "ended" || release.status === "cancelled") return false;
  return new Date(dropAt).getTime() >= now.getTime();
}

export function markPastReleases(releases: Release[], now = new Date()): Release[] {
  return releases.map((r) => {
    const dropAt = getDropAt(r);
    if (!dropAt) return r;
    if (new Date(dropAt).getTime() < now.getTime() && r.status !== "ended") {
      return { ...r, status: "ended" };
    }
    return r;
  });
}

export interface DropFilterOptions {
  includePast?: boolean;
  now?: Date;
}

/** Central filter — default: only upcoming drops. */
export function filterReleasesByTime(
  releases: Release[],
  options: DropFilterOptions = {}
): Release[] {
  const now = options.now ?? new Date();
  const withStatus = markPastReleases(releases, now);

  if (options.includePast) return withStatus;

  return withStatus.filter((r) => isUpcomingRelease(r, now));
}

export function sortReleasesByDropAt(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => {
    const ta = getDropAt(a);
    const tb = getDropAt(b);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return new Date(ta).getTime() - new Date(tb).getTime();
  });
}

export function applyDefaultDropFilters(
  releases: Release[],
  options: DropFilterOptions = {}
): Release[] {
  return sortReleasesByDropAt(filterReleasesByTime(releases, options));
}

export { DISPLAY_TZ };
