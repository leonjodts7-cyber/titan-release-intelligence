import type { Notification, SourceAdapter, ScanJob } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import type { CommandCenterMetrics } from "@/components/intelligence/command-center-bar";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";

export function buildCommandCenterMetrics(input: {
  sources: SourceAdapter[];
  scans: ScanJob[];
  notifications: Notification[];
  releases: EnrichedRelease[];
  profitPool: number;
  topRoi: number;
}): CommandCenterMetrics {
  const { sources, scans, notifications, releases, profitPool, topRoi } = input;
  const dayAgo = Date.now() - 86400000;

  const categoryCounts: Record<string, number> = {};
  for (const release of releases) {
    const category = release.release_categories?.name ?? "Other";
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const topEvent = releases
    .filter((r) => r.release_type === "ticket")
    .sort((a, b) => b.opportunity_score - a.opportunity_score)[0]?.title ?? "—";
  const topProduct = releases
    .filter((r) => r.release_type !== "ticket")
    .sort((a, b) => b.opportunity_score - a.opportunity_score)[0]?.title ?? "—";

  return {
    sourcesOnline: sources.filter((s) => s.enabled && !s.last_error).length,
    sourcesTotal: sources.filter((s) => s.enabled).length,
    pipelineActive: true,
    aiActive: Boolean(process.env.OPENAI_API_KEY),
    dbConnected: isSupabaseConfigured(),
    unreadNotifications: notifications.filter((n) => n.status !== "read").length,
    scansToday: scans.filter((s) => s.started_at && new Date(s.started_at).getTime() > dayAgo).length,
    changesToday: releases.filter((r) => r.last_changed_at && new Date(r.last_changed_at).getTime() > dayAgo).length,
    criticalCount: releases.filter((r) =>
      r.opportunity_action === "TOP OPPORTUNITY" || r.opportunity_action === "MUST WATCH"
    ).length,
    opportunityCount: releases.filter((r) => r.opportunity_action !== "IGNORE").length,
    profitPool,
    topRoi,
    topCategory,
    topEvent,
    topProduct,
    lastScanAt: scans[0]?.started_at ?? null,
  };
}
