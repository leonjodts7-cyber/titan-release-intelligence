import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import { getNotifications } from "@/lib/data/notifications";
import { getActivityFeed } from "@/lib/data/activity-feed";
import { getModelAccuracy } from "@/lib/data/portfolio";
import {
  enrichReleases, getDashboardSections, sortByOpportunity,
  getTotalProfitOpportunity, getTcgOpportunities, getSneakerDrops, sortByNetRoi,
} from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { buildCommandCenterMetrics } from "@/lib/data/dashboard-metrics";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { ReleaseCard } from "@/components/releases/release-card";
import { releaseIntelligenceService } from "@/services/release-intelligence.service";
import { formatEur } from "@/lib/money";

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
  const { mustWatch, bestResale, highestRoi } = getDashboardSections(releases, 5);
  const tcg = getTcgOpportunities(releases, 4);
  const sneakers = getSneakerDrops(releases, 4);
  const profitPool = getTotalProfitOpportunity(releases);
  const top = ranked[0];
  const topBrief = top ? releaseIntelligenceService.analyze(top).full_brief : "";
  const netRoiSorted = sortByNetRoi(releases);
  const modelAccuracy = getModelAccuracy();
  const commandCenterMetrics = buildCommandCenterMetrics({
    sources,
    scans,
    notifications,
    releases,
    profitPool,
    topRoi: netRoiSorted[0]?.net_roi_mid ?? 0,
  });

  const critical = commandCenterMetrics.criticalCount;
  const avgNetRoi = releases.length
    ? Math.round(releases.reduce((s, r) => s + (r.net_roi_mid ?? 0), 0) / releases.length)
    : 0;

  return (
    <IntelligenceLayout activityFeed={feed} commandCenterMetrics={commandCenterMetrics}>
      <div className="p-3 md:p-4 space-y-3 max-w-[1600px]">
        {topBrief && (
          <div className="intel-card border-l-2 border-l-fuchsia-500/60">
            <div className="intel-section-title mb-1">Top Intelligence Brief</div>
            <p className="text-xs text-zinc-300 leading-relaxed">{topBrief}</p>
          </div>
        )}

        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
          <IntelStat label="Tracked" value={releases.length} compact />
          <IntelStat label="Critical" value={critical} trend={critical > 0 ? "up" : "neutral"} compact />
          <IntelStat label="Avg Net ROI" value={`${avgNetRoi}%`} compact />
          <IntelStat label="Profit Pool" value={formatEur(profitPool)} trend="up" compact />
          <IntelStat label="Momentum" value={top?.momentum_score ?? "—"} compact />
          <IntelStat label="Confidence" value={`${top?.resale_confidence_score ?? "—"}%`} compact />
          <IntelStat label="Failed Src" value={failed.length} trend={failed.length ? "down" : "neutral"} compact />
          <IntelStat label="Liquidity" value={`${Math.round(top?.market_liquidity_score ?? 0)}%`} compact />
        </div>

        <div className="intel-card flex items-center justify-between text-xs">
          <div>
            <div className="intel-section-title mb-0.5">Model accuracy</div>
            {modelAccuracy.accuracyPct != null ? (
              <span className="text-zinc-300">
                {modelAccuracy.accuracyPct}% within predicted range · avg deviation {modelAccuracy.avgDeviation}% · n={modelAccuracy.sampleSize}
              </span>
            ) : (
              <span className="text-zinc-500">Onvoldoende data ({modelAccuracy.sampleSize}/5 verkochte posities)</span>
            )}
          </div>
          <Link href="/dashboard/portfolio" className="text-[10px] text-titan-accent">Portfolio →</Link>
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
              <span className="intel-section-title">Highest Net ROI</span>
              <Link href="/dashboard/opportunities?sort=roi" className="text-[10px] text-titan-accent">Rank →</Link>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {highestRoi.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
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
