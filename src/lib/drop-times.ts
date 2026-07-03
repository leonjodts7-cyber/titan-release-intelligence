import type { Release } from "@/types";
import { classifyRelease } from "@/lib/categories/taxonomy";

export type DropSlot =
  | "snkrs"
  | "raffle"
  | "tm_presale"
  | "tm_general"
  | "pokemon_center"
  | "us_drop"
  | "default";

const SLOT_HOURS: Record<DropSlot, number[]> = {
  snkrs: [9],
  raffle: [10],
  tm_presale: [10, 12],
  tm_general: [10],
  pokemon_center: [15],
  us_drop: [16, 18],
  default: [10],
};

const ALLOWED_MINUTES = new Set([0, 15, 30, 45]);

/** Minutes must be :00, :15, :30 or :45 — never :32, :47, etc. */
export function isRealisticDropMinute(min: number): boolean {
  return ALLOWED_MINUTES.has(min);
}

export function isRealisticDropTime(iso: string): boolean {
  const d = new Date(iso);
  const brussels = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const min = Number(brussels.find((p) => p.type === "minute")?.value ?? -1);
  const isMidnight =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (isMidnight) return true;
  return isRealisticDropMinute(min);
}

function brusselsParts(iso: string) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

/** Snap wall-clock Brussels time to a realistic slot. */
export function snapToSlot(
  iso: string,
  slot: DropSlot,
  slotIndex = 0,
  confirmed = false
): { iso: string; confirmed: boolean } {
  const p = brusselsParts(iso);
  const hours = SLOT_HOURS[slot];
  const h = hours[slotIndex % hours.length] ?? 10;
  const offset = 2; // CEST default for mock data
  const snapped = new Date(Date.UTC(p.y, p.m - 1, p.d, h - offset, 0));
  return { iso: snapped.toISOString(), confirmed };
}

export function inferDropSlot(release: Release): DropSlot {
  const main = classifyRelease(release).main;
  const event = release.drop_event_type;
  const url = (release.official_url ?? release.source_url ?? "").toLowerCase();
  const title = release.title.toLowerCase();

  if (main === "tickets") {
    if (event === "presale") return "tm_presale";
    return "tm_general";
  }
  if (main === "kaarten") {
    if (url.includes("pokemoncenter") || title.includes("pokémon") || title.includes("pokemon")) {
      return "pokemon_center";
    }
    return "pokemon_center";
  }
  if (main === "schoenen") {
    if (url.includes("snkrs") || url.includes("nike.com")) return "snkrs";
    return "raffle";
  }
  if (release.currency === "USD" || release.countries?.code === "US") return "us_drop";
  return "default";
}

export function normalizeDropTime(
  release: Release,
  iso: string,
  confirmed?: boolean
): { iso: string; confirmed: boolean } {
  const slot = inferDropSlot(release);
  const specConfirmed = confirmed ?? release.drop_time_confirmed ?? false;
  const p = brusselsParts(iso);
  const isDateOnly =
    new Date(iso).getUTCHours() === 0 &&
    new Date(iso).getUTCMinutes() === 0 &&
    new Date(iso).getUTCSeconds() === 0;

  if (isDateOnly) {
    const { iso: snapped } = snapToSlot(iso, slot, 0, false);
    return { iso: snapped, confirmed: false };
  }

  if (!isRealisticDropTime(iso)) {
    const idx = release.id ? Number(release.id) % 2 : 0;
    return snapToSlot(iso, slot, idx, specConfirmed);
  }

  return { iso, confirmed: specConfirmed };
}
