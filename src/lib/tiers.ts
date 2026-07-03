import type { OpportunityAction } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropAt } from "@/lib/drop";
import { sortByDropTime } from "@/lib/drop";

/** Fixed tier order: TOP → BASIS */
export const TIER_ORDER: OpportunityAction[] = [
  "TOP OPPORTUNITY",
  "MUST WATCH",
  "HIGH PRIORITY",
  "WATCH",
  "IGNORE",
];

export const TIER_SHORT: Record<OpportunityAction, string> = {
  "TOP OPPORTUNITY": "TOP",
  "MUST WATCH": "MUST WATCH",
  "HIGH PRIORITY": "HIGH",
  PRIORITY: "HIGH",
  PREPARE: "WATCH",
  WATCH: "WATCH",
  IGNORE: "BASIS",
};

export const TIER_BORDER: Record<string, string> = {
  TOP: "border-l-fuchsia-500",
  "MUST WATCH": "border-l-red-500",
  HIGH: "border-l-orange-500",
  WATCH: "border-l-blue-500",
  BASIS: "border-l-zinc-600",
};

export const TIER_CHIP: Record<string, string> = {
  TOP: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40",
  "MUST WATCH": "bg-red-500/20 text-red-300 border-red-500/40",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  WATCH: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  BASIS: "bg-zinc-600/20 text-zinc-400 border-zinc-600/40",
};

export function tierShortLabel(action?: OpportunityAction | null): string {
  if (!action) return "BASIS";
  return TIER_SHORT[action] ?? "BASIS";
}

export function tierRank(action?: OpportunityAction | null): number {
  const idx = TIER_ORDER.indexOf(action ?? "IGNORE");
  return idx >= 0 ? idx : TIER_ORDER.length;
}

export function groupReleasesByTier(releases: EnrichedRelease[]): [string, EnrichedRelease[]][] {
  const map = new Map<string, EnrichedRelease[]>();
  for (const r of releases) {
    const key = tierShortLabel(r.opportunity_action);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  const order = ["TOP", "MUST WATCH", "HIGH", "WATCH", "BASIS"];
  return order
    .filter((k) => map.has(k))
    .map((k) => [k, sortByDropTime(map.get(k)!)] as [string, EnrichedRelease[]]);
}

export function whyTierLine(release: EnrichedRelease): string {
  if (release.hype_reason) return release.hype_reason;
  const score = Math.round(release.opportunity_score);
  const tier = tierShortLabel(release.opportunity_action);
  if (tier === "TOP") return `Score ${score} — absolute topkans in de komende maanden.`;
  if (tier === "MUST WATCH") return `Score ${score} — sterke vraag en beperkte supply.`;
  if (tier === "HIGH") return `Score ${score} — bovengemiddeld winstpotentieel.`;
  if (tier === "WATCH") return `Score ${score} — interessant om te volgen.`;
  return `Score ${score} — standaard monitoring.`;
}

export function dropHourLabel(iso: string | null | undefined, confirmed: boolean): string | null {
  if (!iso || !confirmed) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
}

export function isWithinDays(iso: string | null | undefined, days: number, now = new Date()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  const start = now.getTime();
  const end = start + days * 86400000;
  return t >= start - 3600_000 && t <= end;
}

export function isTodayOrTomorrow(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const t = d.getTime();
  return t >= today.getTime() && t < dayAfter.getTime();
}

export function dropDayKey(iso: string, tz = "Europe/Brussels"): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: tz });
}
