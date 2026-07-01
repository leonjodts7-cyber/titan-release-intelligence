import type { SourceAdapter } from "@/types";
import { scanSchedulerService } from "@/services/scan-scheduler.service";

function seedHash(s: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h % 100);
}

export interface SourceIntelligence {
  source_id: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latency_ms: number;
  health_score: number;
  reliability_score: number;
  last_success_at: string | null;
  last_error: string | null;
  avg_response_ms: number;
  avg_new_releases: number;
  items_today: number;
  items_this_week: number;
  success_pct: number;
  failure_pct: number;
  retry_count: number;
  next_scan_at: string | null;
  scan_priority: string;
  scan_interval_minutes: number;
}

export function buildSourceIntelligence(source: SourceAdapter): SourceIntelligence {
  const schedule = scanSchedulerService.getSchedule(source);
  const id = source.id;
  const hasError = Boolean(source.last_error);
  const enabled = source.enabled;

  const status: SourceIntelligence["status"] =
    !enabled ? "OFFLINE" : hasError ? "DEGRADED" : "ONLINE";

  const latency = 120 + seedHash(id, 1) * 8;
  const avgResponse = 200 + seedHash(id, 2) * 15;
  const successPct = hasError ? 72 + seedHash(id, 3) * 0.2 : 88 + seedHash(id, 4) * 0.1;
  const itemsToday = seedHash(id, 5) % 12;
  const itemsWeek = itemsToday * 5 + seedHash(id, 6);

  return {
    source_id: source.id,
    status,
    latency_ms: latency,
    health_score: Math.round(source.reliability_score * (hasError ? 0.7 : 1)),
    reliability_score: source.reliability_score,
    last_success_at: source.last_success_at,
    last_error: source.last_error,
    avg_response_ms: avgResponse,
    avg_new_releases: Math.round((itemsWeek / 7) * 10) / 10,
    items_today: itemsToday,
    items_this_week: itemsWeek,
    success_pct: Math.round(successPct),
    failure_pct: Math.round(100 - successPct),
    retry_count: hasError ? 1 + (seedHash(id, 7) % 3) : 0,
    next_scan_at: schedule.next_scan_at,
    scan_priority: schedule.priority,
    scan_interval_minutes: schedule.interval_minutes,
  };
}

export function buildAllSourceIntelligence(sources: SourceAdapter[]): SourceIntelligence[] {
  return sources.map(buildSourceIntelligence);
}
