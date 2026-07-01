import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, differenceInSeconds, differenceInHours, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatCountdown(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  const target = new Date(dateStr);
  const now = new Date();
  const seconds = differenceInSeconds(target, now);

  if (seconds < 0) return "Live / Past";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${differenceInHours(target, now)}h`;
  if (seconds < 604800) return `${differenceInDays(target, now)}d`;
  return formatDistanceToNow(target, { addSuffix: true });
}

export function priorityColor(level: string): string {
  switch (level) {
    case "EXTREME":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "HIGH":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "MEDIUM":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-green-500/20 text-green-400 border-green-500/30";
  }
}

export function priorityDot(level: string): string {
  switch (level) {
    case "EXTREME":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-yellow-500";
    default:
      return "bg-green-500";
  }
}

export function formatPrice(min: number | null, max: number | null, currency: string): string {
  if (min === null && max === null) return "TBA";
  if (min === max || max === null) return `${currency} ${min}`;
  return `${currency} ${min} – ${max}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PRIORITY_ORDER = { EXTREME: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function sortByPriority<T extends { priority_level: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority_level as keyof typeof PRIORITY_ORDER] ?? 4) -
      (PRIORITY_ORDER[b.priority_level as keyof typeof PRIORITY_ORDER] ?? 4)
  );
}

export function isWithinHours(dateStr: string | null, hours: number): boolean {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff <= hours * 3600 * 1000;
}

export function isWithinDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff <= days * 86400 * 1000;
}
