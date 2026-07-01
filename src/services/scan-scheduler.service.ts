import type { SourceAdapter } from "@/types";

export type ScanPriority = "EXTREME" | "HIGH" | "NORMAL" | "LOW";

const INTERVALS: Record<ScanPriority, number> = {
  EXTREME: 5,
  HIGH: 10,
  NORMAL: 15,
  LOW: 30,
};

const PRIORITY_MAP: Record<string, ScanPriority> = {
  "Nike SNKRS": "EXTREME",
  "Adidas Confirmed": "EXTREME",
  Ticketmaster: "HIGH",
  LiveNation: "HIGH",
  AXS: "HIGH",
  UEFA: "HIGH",
  NFL: "EXTREME",
  FIFA: "HIGH",
  "TCGplayer": "HIGH",
  "Pokémon Center": "HIGH",
  StockX: "NORMAL",
  GOAT: "NORMAL",
  Eventim: "NORMAL",
  "RSS Feeds": "LOW",
};

export interface ScanScheduleInfo {
  priority: ScanPriority;
  interval_minutes: number;
  next_scan_at: string | null;
  is_due: boolean;
  retry_backoff_minutes: number | null;
}

export class ScanSchedulerService {
  getPriority(source: SourceAdapter): ScanPriority {
    if (source.last_error) return "HIGH";
    return PRIORITY_MAP[source.name] ?? "NORMAL";
  }

  getInterval(source: SourceAdapter): number {
    const priority = this.getPriority(source);
    return INTERVALS[priority];
  }

  getSchedule(source: SourceAdapter): ScanScheduleInfo {
    const priority = this.getPriority(source);
    const interval = INTERVALS[priority];
    const lastScan = source.last_scan_at ? new Date(source.last_scan_at).getTime() : 0;
    const backoff = source.last_error ? Math.min(60, interval * 2) : null;
    const effectiveInterval = backoff ?? interval;
    const nextAt = lastScan ? new Date(lastScan + effectiveInterval * 60000) : null;
    const isDue = !lastScan || (nextAt !== null && Date.now() >= nextAt.getTime());

    return {
      priority,
      interval_minutes: interval,
      next_scan_at: nextAt?.toISOString() ?? null,
      is_due: isDue,
      retry_backoff_minutes: backoff,
    };
  }

  getDueSources(sources: SourceAdapter[]): SourceAdapter[] {
    return sources
      .filter((s) => s.enabled)
      .filter((s) => this.getSchedule(s).is_due)
      .sort((a, b) => {
        const order = { EXTREME: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        return order[this.getPriority(a)] - order[this.getPriority(b)];
      });
  }
}

export const scanSchedulerService = new ScanSchedulerService();
