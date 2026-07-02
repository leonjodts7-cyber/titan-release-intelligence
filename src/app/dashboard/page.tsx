import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import { getNotifications } from "@/lib/data/notifications";
import { getActivityFeed } from "@/lib/data/activity-feed";
import { getModelAccuracy } from "@/lib/data/portfolio";
import {
  enrichReleases,
  getDashboardSections,
  getTcgOpportunities,
  getSneakerDrops,
} from "@/lib/data/enrich-releases";
import { computeDashboardMetrics } from "@/lib/metrics";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { buildCommandCenterMetrics } from "@/lib/data/dashboard-metrics";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { ReleaseCard } from "@/components/releases/release-card";
import { releaseIntelligenceService } from "@/services/release-intelligence.service";
import { formatEur } from "@/lib/money";
import { t } from "@/lib/i18n";
import { sortByOpportunity } from "@/lib/data/enrich-releases";

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
  const metrics = computeDashboardMetrics(releases);
  const top = ranked[0];
  const topBrief = top ? releaseIntelligenceService.analyze(top).full_brief : "";
  const modelAccuracy = getModelAccuracy();
  const commandCenterMetrics = buildCommandCenterMetrics({
    sources,
    scans,
    notifications,
    releases,
  });

  return (
    <IntelligenceLayout activityFeed={feed} commandCenterMetrics={commandCenterMetrics}>
      <div className="p-3 md:p-4 space-y-3 max-w-[1600px]">
        {topBrief && (
          <div className="intel-card border-l-2 border-l-fuchsia-500/60">
            <div className="intel-section-title mb-1">{t("dashboard.topBrief")}</div>
            <p className="text-xs text-zinc-300 leading-relaxed">{topBrief}</p>
          </div>
        )}

        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
          <IntelStat label={t("dashboard.tracked")} value={releases.length} compact />
          <IntelStat label={t("dashboard.critical")} value={metrics.criticalCount} trend={metrics.criticalCount > 0 ? "up" : "neutral"} compact />
          <IntelStat label={t("dashboard.avgNetRoi")} value={`${metrics.avgNetRoi}%`} compact />
          <IntelStat label={t("dashboard.profitPool")} value={formatEur(metrics.profitPool)} trend={metrics.profitPool >= 0 ? "up" : "down"} compact />
          <IntelStat label={t("dashboard.momentum")} value={top?.momentum_score ?? "—"} compact />
          <IntelStat label={t("dashboard.confidence")} value={`${top?.resale_confidence_score ?? "—"}%`} compact />
          <IntelStat label={t("dashboard.failedSources")} value={failed.length} trend={failed.length ? "down" : "neutral"} compact />
          <IntelStat label={t("dashboard.liquidity")} value={`${Math.round(top?.market_liquidity_score ?? 0)}%`} compact />
        </div>

        <div className="intel-card flex items-center justify-between text-xs">
          <div>
            <div className="intel-section-title mb-0.5">{t("dashboard.modelAccuracy")}</div>
            {modelAccuracy.accuracyPct != null ? (
              <span className="text-zinc-300">
                {t("dashboard.modelWithin", {
                  pct: modelAccuracy.accuracyPct,
                  dev: modelAccuracy.avgDeviation ?? 0,
                  n: modelAccuracy.sampleSize,
                })}
              </span>
            ) : (
              <span className="text-zinc-500">
                {t("dashboard.modelInsufficient", { n: modelAccuracy.sampleSize })}
              </span>
            )}
          </div>
          <Link href="/dashboard/portfolio" className="text-[10px] text-titan-accent">
            {t("nav.portfolio")} →
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-3">
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">{t("dashboard.mustWatch")}</span>
              <Link href="/dashboard/opportunities" className="text-[10px] text-titan-accent">{t("terms.viewAll")}</Link>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {mustWatch.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </section>
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">{t("dashboard.bestResale")}</span>
              <Link href="/dashboard/market" className="text-[10px] text-titan-accent">{t("nav.market")} →</Link>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {bestResale.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </section>
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">{t("dashboard.highestRoi")}</span>
              <Link href="/dashboard/opportunities?sort=roi" className="text-[10px] text-titan-accent">{t("terms.rank")}</Link>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {highestRoi.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">{t("dashboard.tcgIntel")}</span>
              <Link href="/dashboard/tcg" className="text-[10px] text-titan-accent">{t("terms.module")}</Link>
            </div>
            <div className="space-y-1.5">{tcg.map((r) => <ReleaseCard key={r.id} release={r} compact />)}</div>
          </section>
          <section className="intel-card">
            <div className="flex justify-between mb-2">
              <span className="intel-section-title">{t("dashboard.sneakerDrops")}</span>
              <Link href="/dashboard/market" className="text-[10px] text-titan-accent">{t("nav.market")} →</Link>
            </div>
            <div className="space-y-1.5">{sneakers.map((r) => <ReleaseCard key={r.id} release={r} compact />)}</div>
          </section>
        </div>
      </div>
    </IntelligenceLayout>
  );
}
