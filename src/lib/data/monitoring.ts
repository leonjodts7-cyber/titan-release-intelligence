import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { getAlertEvents } from "@/lib/data/alert-rules";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";

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
    avg_opportunity_score: Math.round(releases.reduce((s, r) => s + r.opportunity_score, 0) / releases.length),
    profit_pool_estimate: releases.reduce((s, r) => s + (r.expected_profit_mid ?? 0), 0),
  };
}
