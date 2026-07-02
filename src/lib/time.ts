/**
 * Enige tijdmodule — weergave altijd in Europe/Brussels (nl-BE).
 */
export const DISPLAY_TZ = "Europe/Brussels";

const DAY_NAMES = ["zo", "ma", "di", "wo", "do", "vr", "za"] as const;
const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;

export interface DropTimeInput {
  dropAt: string | null;
  dropTimeConfirmed: boolean;
  /** When false, only date is known — never show a fabricated clock time. */
  hasTime?: boolean;
}

function partsInBrussels(iso: string): { y: number; m: number; d: number; h: number; min: number; wd: number } {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const wdStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour"),
    min: get("minute"),
    wd: wdMap[wdStr] ?? 0,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "vr 4 apr · 09:00" or date-only variants */
export function formatDrop(input: DropTimeInput): string {
  if (!input.dropAt) return "datum onbekend";

  const p = partsInBrussels(input.dropAt);
  const datePart = `${DAY_NAMES[p.wd]} ${p.d} ${MONTH_NAMES[p.m - 1]}`;

  if (input.hasTime === false) {
    return `${datePart} · tijd nog onbekend`;
  }

  const utc = new Date(input.dropAt);
  const isMidnightUtc =
    utc.getUTCHours() === 0 && utc.getUTCMinutes() === 0 && utc.getUTCSeconds() === 0;

  if (!input.dropTimeConfirmed && isMidnightUtc) {
    return `${datePart} · tijd nog onbekend`;
  }

  const timePart = `${pad2(p.h)}:${pad2(p.min)}`;

  if (input.dropTimeConfirmed) {
    return `${datePart} · ${timePart}`;
  }

  return `${datePart} · ±${timePart} (verwacht)`;
}

/** Short time label for cards */
export function formatDropTime(input: DropTimeInput): string {
  if (!input.dropAt) return "—";
  if (input.hasTime === false) return "tijd nog onbekend";

  const p = partsInBrussels(input.dropAt);
  const timePart = `${pad2(p.h)}:${pad2(p.min)}`;

  if (input.dropTimeConfirmed) return timePart;
  return `±${timePart}`;
}

export function msUntilDrop(dropAt: string | null): number | null {
  if (!dropAt) return null;
  const ms = new Date(dropAt).getTime() - Date.now();
  return ms;
}

export function isWithinHours(dropAt: string | null, hours: number): boolean {
  const ms = msUntilDrop(dropAt);
  if (ms == null) return false;
  return ms > 0 && ms <= hours * 3600_000;
}

/** "over 2 u 14 m" / "morgen 10:00" / "verlopen" */
export function formatRelative(dropAt: string | null, now = Date.now()): string {
  if (!dropAt) return "—";
  const target = new Date(dropAt).getTime();
  const diff = target - now;

  if (diff <= 0) return "verlopen";

  const p = partsInBrussels(dropAt);
  const nowP = partsInBrussels(new Date(now).toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomP = partsInBrussels(tomorrow.toISOString());

  const isTomorrow = p.y === tomP.y && p.m === tomP.m && p.d === tomP.d;
  const isToday = p.y === nowP.y && p.m === nowP.m && p.d === nowP.d;

  if (isTomorrow && diff < 48 * 3600_000) {
    return `morgen ${pad2(p.h)}:${pad2(p.min)}`;
  }

  const totalMin = Math.floor(diff / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (isToday && h < 24) {
    if (h < 1) return `over ${m} m`;
    if (m === 0) return `over ${h} u`;
    return `over ${h} u ${m} m`;
  }

  if (h < 48) {
    if (h < 1) return `over ${m} m`;
    return `over ${h} u ${m} m`;
  }

  const days = Math.floor(h / 24);
  return `over ${days} d`;
}

/** Live countdown "02:14:33" — only meaningful within 24h */
export function formatCountdownLive(dropAt: string | null, now = Date.now()): string | null {
  if (!dropAt) return null;
  const diff = new Date(dropAt).getTime() - now;
  if (diff <= 0) return null;
  if (diff > 24 * 3600_000) return null;

  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export type CountdownUrgency = "normal" | "soon" | "urgent";

export function countdownUrgency(dropAt: string | null, now = Date.now()): CountdownUrgency {
  if (!dropAt) return "normal";
  const diff = new Date(dropAt).getTime() - now;
  if (diff <= 0 || diff > 24 * 3600_000) return "normal";
  if (diff < 3600_000) return "urgent";
  return "soon";
}
