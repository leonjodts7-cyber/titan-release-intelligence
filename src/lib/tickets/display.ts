import type { Release } from "@/types";
import { getDropAt, getDropMeta } from "@/lib/drop";
import { formatDrop } from "@/lib/time";

const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;

function eventLabel(iso: string, city?: string | null): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    month: "short",
    year: "numeric",
  });
  const parts = fmt.formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const nlMonth = MONTH_NAMES[d.getUTCMonth()] ?? month;
  return city ? `${nlMonth} ${year}, ${city}` : `${nlMonth} ${year}`;
}

export function formatTicketSaleLine(release: Release): string {
  const dropAt = getDropAt(release);
  if (release.status === "on_sale" && !dropAt) {
    return release.hype_reason ?? "Verkoop loopt";
  }
  const meta = getDropMeta(release);
  return `Verkoop: ${formatDrop(meta)}`;
}

export function formatTicketEventLine(release: Release): string | null {
  if (!release.event_date) return null;
  const city = release.cities?.name ?? release.venues?.name ?? null;
  return `Event: ${eventLabel(release.event_date, city)}`;
}

export function formatTicketEventTooltip(release: Release): string | null {
  if (!release.event_date) return null;
  const city = release.cities?.name;
  return formatTicketEventLine(release);
}
