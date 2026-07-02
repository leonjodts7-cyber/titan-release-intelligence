import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { getAlertEvents } from "@/lib/data/alert-rules";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";
import { getLastIngestAt } from "@/lib/sources/ingest";

export interface SourceStatusRow {
  id: string;
  name: string;
  online: boolean;
  last_scan_at: string | null;
  items_found: number;
  last_error: string | null;
}

export interface ScanLogEntry {
  id: string;
  source_name: string;
  message: string;
  level: string;
  created_at: string;
}

export interface MonitoringSnapshot {
  timestamp: string;
  releases_tracked: number;
  critical_opportunities: number;
  sources_online: number;
  sources_failed: number;
  scans_last_hour: number;
  alerts_triggered_24h: number;
  pipeline_healthy: boolean;
  db_connected: boolean;
  avg_opportunity_score: number;
  profit_pool_estimate: number;
  source_rows: SourceStatusRow[];
  recent_scan_logs: ScanLogEntry[];
  errors_24h: ScanLogEntry[];
  last_ingest_at: string | null;
}

export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const [releases, sources, scans, failed, events] = await Promise.all([
    enrichReleases(await getReleases()),
    getSourceAdapters(),
    getScanJobs(50),
    getFailedSources(),
    Promise.resolve(getAlertEvents(100)),
  ]);

  const hourAgo = Date.now() - 3600000;
  const dayAgo = Date.now() - 86400000;

  const scanBySource = new Map<string, (typeof scans)[0]>();
  for (const s of scans) {
    const key = s.source_adapter_id;
    if (!scanBySource.has(key)) scanBySource.set(key, s);
  }

  const source_rows: SourceStatusRow[] = sources.map((s) => {
    const job = scanBySource.get(s.id);
    return {
      id: s.id,
      name: s.name,
      online: s.enabled && !s.last_error,
      last_scan_at: job?.finished_at ?? job?.started_at ?? s.last_scan_at,
      items_found: job?.items_found ?? 0,
      last_error: s.last_error,
    };
  });

  const recent_scan_logs: ScanLogEntry[] = scans.slice(0, 8).map((s) => ({
    id: s.id,
    source_name: (s as { source_adapters?: { name: string } }).source_adapters?.name ?? s.source_adapter_id,
    message:
      s.status === "failed"
        ? `Scan mislukt: ${s.error_message ?? "onbekende fout"}`
        : `Scan voltooid — ${s.items_found} gevonden, ${s.items_created} nieuw, ${s.items_updated} bijgewerkt`,
    level: s.status === "failed" ? "error" : "info",
    created_at: s.finished_at ?? s.started_at ?? s.created_at,
  }));

  const errors_24h = scans
    .filter((s) => s.status === "failed" && new Date(s.created_at).getTime() > dayAgo)
    .map((s) => ({
      id: s.id,
      source_name: (s as { source_adapters?: { name: string } }).source_adapters?.name ?? s.source_adapter_id,
      message: s.error_message ?? "Scan mislukt",
      level: "error" as const,
      created_at: s.finished_at ?? s.started_at ?? s.created_at,
    }));

  return {
    timestamp: new Date().toISOString(),
    releases_tracked: releases.length,
    critical_opportunities: releases.filter((r) =>
      r.opportunity_action === "TOP OPPORTUNITY" || r.opportunity_action === "MUST WATCH"
    ).length,
    sources_online: sources.filter((s) => s.enabled && !s.last_error).length,
    sources_failed: failed.length,
    scans_last_hour: scans.filter((s) => s.started_at && new Date(s.started_at).getTime() > hourAgo).length,
    alerts_triggered_24h: events.filter((e) => new Date(e.triggered_at).getTime() > dayAgo).length,
    pipeline_healthy: failed.length < 3,
    db_connected: isSupabaseConfigured(),
    avg_opportunity_score: releases.length
      ? Math.round(releases.reduce((s, r) => s + r.opportunity_score, 0) / releases.length)
      : 0,
    profit_pool_estimate: releases.reduce((s, r) => s + (r.expected_profit_mid ?? 0), 0),
    source_rows,
    recent_scan_logs,
    errors_24h,
    last_ingest_at: getLastIngestAt(),
  };
}
