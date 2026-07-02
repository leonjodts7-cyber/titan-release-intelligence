import type { Release } from "@/types";
import type { DropTimeInput } from "@/lib/time";

export type DropCategory = "sneakers" | "tickets" | "tcg" | "other";
export type DropEventKind = "preorder" | "release" | "presale" | "general_sale";

export interface DropMeta extends DropTimeInput {
  dropEventKind: DropEventKind;
  dropCategory: DropCategory;
  retailer?: string;
}

export function getDropAt(release: Release): string | null {
  return release.drop_at ?? release.release_starts_at ?? release.general_sale_starts_at ?? release.presale_starts_at;
}

export function getDropMeta(release: Release): DropMeta {
  const dropAt = getDropAt(release);
  const confirmed = release.drop_time_confirmed ?? false;
  const hasTime = confirmed || (dropAt ? !isDateOnlyUtc(dropAt) : false);

  return {
    dropAt,
    dropTimeConfirmed: confirmed,
    hasTime,
    dropEventKind: (release.drop_event_type as DropEventKind) ?? inferEventKind(release),
    dropCategory: inferDropCategory(release),
    retailer: inferRetailer(release),
  };
}

function isDateOnlyUtc(iso: string): boolean {
  const d = new Date(iso);
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

function inferEventKind(release: Release): DropEventKind {
  if (release.drop_event_type) return release.drop_event_type as DropEventKind;
  if (release.tcg_name && release.presale_starts_at && release.presale_starts_at === release.release_starts_at) {
    return "preorder";
  }
  if (release.presale_starts_at && getDropAt(release) === release.presale_starts_at) return "presale";
  return "release";
}

export function inferDropCategory(release: Release): DropCategory {
  const slug = release.release_categories?.slug ?? "";
  if (slug === "limited-sneakers" || release.brands?.name === "Nike" || release.brands?.name === "Jordan") {
    return "sneakers";
  }
  if (release.release_type === "ticket" || slug.includes("ticket") || slug.includes("festival")) {
    return "tickets";
  }
  if (release.tcg_name || slug === "tcg-collectibles") return "tcg";
  return "other";
}

function inferRetailer(release: Release): string | undefined {
  const url = release.official_url ?? release.source_url ?? "";
  if (url.includes("nike.com") || url.includes("snkrs")) return "SNKRS";
  if (url.includes("ticketmaster")) return "Ticketmaster";
  if (url.includes("pokemoncenter")) return "Pokémon Center";
  if (url.includes("bol.com")) return "bol.com";
  return undefined;
}

export function sortByDropTime<T extends Release>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = getDropAt(a);
    const tb = getDropAt(b);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return new Date(ta).getTime() - new Date(tb).getTime();
  });
}

export function isDropTodayOrTomorrow(dropAt: string | null, now = new Date()): boolean {
  if (!dropAt) return false;
  const target = partsBrussels(dropAt);
  const today = partsBrussels(now.toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tom = partsBrussels(tomorrow.toISOString());
  return (
    (target.y === today.y && target.m === today.m && target.d === today.d) ||
    (target.y === tom.y && target.m === tom.m && target.d === tom.d)
  );
}

function partsBrussels(iso: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = fmt.formatToParts(new Date(iso));
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}
