import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import { getNotifications } from "@/lib/data/notifications";
import { getActivityFeed } from "@/lib/data/activity-feed";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";
import {
  enrichReleases, getMustWatch, getTopResaleOpportunities, sortByRoi,
  getTotalProfitOpportunity, getTcgOpportunities, getSneakerDrops, sortByOpportunity,
} from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { CommandCenterBar } from "@/components/intelligence/command-center-bar";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { ReleaseCard } from "@/components/releases/release-card";
import { releaseIntelligenceService } from "@/services/release-intelligence.service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [raw, sources, scans, failed, notifications, feed] = await Promise.all([
    getReleases(),
    getSourceAdapters(),
    getScanJobs(20),
    getFailedSources(),
    getNotifications(),
    getActivityFeed(30),
  ]);

  const releases = enrichReleases(raw);
  const ranked = sortByOpportunity(releases);
  const mustWatch = getMustWatch(releases, 5);
  const bestResale = getTopResaleOpportunities(releases, 5);
  const topRoi = sortByRoi(releases);
  const tcg = getTcgOpportunities(releases, 4);
  const sneakers = getSneakerDrops(releases, 4);
  const profitPool = getTotalProfitOpportunity(releases);
  const top = ranked[0];
  const topBrief = top ? releaseIntelligenceService.analyze(top).full_brief : "";

  const categoryCounts: Record<string, number> = {};
  releases.forEach((r) => {
    const c = r.release_categories?.name ?? "Other";
    categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const topEvent = releases.filter((r) => r.release_type === "ticket").sort((a, b) => b.opportunity_score - a.opportunity_score)[0]?.title ?? "—";
  const topProduct = releases.filter((r) => r.release_type !== "ticket").sort((a, b) => b.opportunity_score - a.opportunity_score)[0]?.title ?? "—";

  const critical = releases.filter((r) =>
    r.opportunity_action === "TOP OPPORTUNITY" || r.opportunity_action === "MUST WATCH"
  ).length;

  return (
    <IntelligenceLayout activityFeed={feed}>
      <div className="p-3 md:p-4 space-y-3 max-w-[1600px]">
        <CommandCenterBar metrics={{
          sourcesOnline: sources.filter((s) => s.enabled && !s.last_error).length,
          sourcesTotal: sources.filter((s) => s.enabled).length,
          pipelineActive: true,
          aiActive: Boolean(process.env.OPENAI_API_KEY),
          dbConnected: isSupabaseConfigured(),
          unreadNotifications: notifications.filter((n) => n.status !== "read").length,
          scansToday: scans.filter((s) => s.started_at && new Date(s.started_at) > new Date(Date.now() - 86400000)).length,
          changesToday: releases.filter((r) => r.last_changed_at && new Date(r.last_changed_at) > new Date(Date.now() - 86400000)).length,
          criticalCount: critical,
          opportunityCount: releases.filter((r) => r.opportunity_action !== "IGNORE").length,
          profitPool,
          topRoi: topRoi[0]?.expected_roi_mid ?? 0,
          topCategory,
          topEvent,
          topProduct,
          lastScanAt: scans[0]?.started_at ?? null,
        }} />

        {topBrief && (
          <div className="intel-card border-l-2 border-l-fuchsia-500/60">
            <div className="intel-section-title mb-1">Top Intelligence Brief</div>
            <p className="text-xs text-zinc-300 leading-relaxed">{topBrief}</p>
          </div>
        )}

        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
          <IntelStat label="Tracked" value={releases.length} compact />
          <IntelStat label="Critical" value={critical} trend={critical > 0 ? "up" : "neutral"} compact />
          <IntelStat label="Avg ROI" value={`${Math.round(releases.reduce((s, r) => s + (r.expected_roi_mid ?? 0), 0) / releases.length)}%`} compact />
          <IntelStat label="Profit Pool" value={`€${Math.round(profitPool / 1000)}k`} trend="up" compact />
          <IntelStat label="Momentum" value={top?.momentum_score ?? "—"} compact />
          <IntelStat label="AI Conf." value={`${top?.ai_confidence ?? "—"}%`} compact />
          <IntelStat label="Failed Src" value={failed.length} trend={failed.length ? "down" : "neutral"} compact />
          <IntelStat label="Liquidity" value={`${Math.round(top?.market_liquidity_score ?? 0)}%`} compact />
        </div>

        <div className="grid lg:grid-cols-3 gap-3">
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">Must Watch</span>
              <Link href="/dashboard/opportunities" className="text-[10px] text-titan-accent">All →</Link>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {mustWatch.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </section>
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">Best Resale</span>
              <Link href="/dashboard/market" className="text-[10px] text-titan-accent">Market →</Link>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {bestResale.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </section>
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">Highest ROI</span>
              <Link href="/dashboard/opportunities?sort=roi" className="text-[10px] text-titan-accent">Rank →</Link>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {topRoi.slice(0, 5).map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">TCG Intelligence</span>
              <Link href="/dashboard/tcg" className="text-[10px] text-titan-accent">Module →</Link>
            </div>
            <div className="space-y-1.5">{tcg.map((r) => <ReleaseCard key={r.id} release={r} compact />)}</div>
          </section>
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">Sneaker Drops</span>
              <Link href="/dashboard/market" className="text-[10px] text-titan-accent">Market →</Link>
            </div>
            <div className="space-y-1.5">{sneakers.map((r) => <ReleaseCard key={r.id} release={r} compact />)}</div>
          </section>
        </div>
      </div>
    </IntelligenceLayout>
  );
}
