import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import {
  enrichReleases, getTopResaleOpportunities, sortByRoi, getTotalProfitOpportunity,
} from "@/lib/data/enrich-releases";
import { isWithinHours, isWithinDays } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardSection } from "@/components/dashboard/section";
import { ReleaseCard } from "@/components/releases/release-card";
import { CommandBar } from "@/components/dashboard/command-bar";
import { AlertTriangle, Zap, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { discoveryService } from "@/services/discovery.service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [rawReleases, sources, scans, failedSources] = await Promise.all([
    getReleases(),
    getSourceAdapters(),
    getScanJobs(8),
    getFailedSources(),
  ]);

  const releases = enrichReleases(rawReleases);
  const extreme = releases.filter((r) => r.priority_level === "EXTREME");
  const criticalNow = releases.filter(
    (r) => isWithinHours(r.release_starts_at, 24) || isWithinHours(r.presale_starts_at, 24)
  );
  const thisWeek = releases.filter((r) => isWithinDays(r.release_starts_at, 7));
  const newSinceScan = releases
    .filter((r) => r.created_at && new Date(r.created_at) > new Date(Date.now() - 24 * 3600000))
    .slice(0, 6);
  const bestResale = getTopResaleOpportunities(releases, 6);
  const highestRoi = sortByRoi(releases).slice(0, 6);
  const healthySources = sources.filter((s) => s.enabled && !s.last_error);
  const lastScan = scans[0];
  const topDiscovery = discoveryService.prioritize(rawReleases).slice(0, 3);
  const profitPool = getTotalProfitOpportunity(releases);
  const topRoi = sortByRoi(releases)[0]?.expected_roi_mid ?? 0;

  const activityFeed = [
    ...scans.slice(0, 4).map((s) => ({
      id: s.id,
      text: `${s.source_adapters?.name}: ${s.status} — found ${s.items_found}, +${s.items_created} new`,
      time: s.started_at,
    })),
    ...newSinceScan.slice(0, 2).map((r) => ({
      id: r.id,
      text: `New: ${r.title} [${r.priority_level}]`,
      time: r.created_at,
    })),
  ].sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime());

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-[1800px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Command Center</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Release intelligence · resale · demand tracking</p>
          </div>
        </div>

        <CommandBar
          sourcesOnline={healthySources.length}
          sourcesTotal={sources.filter((s) => s.enabled).length}
          lastScanAt={lastScan?.started_at ?? sources[0]?.last_scan_at ?? null}
          failedSources={failedSources.length}
          criticalAlerts={criticalNow.length}
          releasesToday={criticalNow.length}
          profitOpportunity={profitPool}
          topRoi={topRoi}
        />

        <div className="grid lg:grid-cols-3 gap-4">
          <DashboardSection title="Critical Now" count={criticalNow.length}
            action={<Link href="/dashboard/releases?sort=date" className="text-xs text-titan-accent hover:underline">View all</Link>}>
            <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin">
              {criticalNow.length > 0 ? criticalNow.map((r) => <ReleaseCard key={r.id} release={r} compact />) : (
                <p className="text-xs text-zinc-500 p-3 border border-dashed border-titan-border rounded-lg">No critical releases in 24h</p>
              )}
            </div>
          </DashboardSection>

          <DashboardSection title="Best Resale Opportunities" count={bestResale.length}
            action={<Link href="/dashboard/releases?sort=roi" className="text-xs text-titan-accent hover:underline">View all</Link>}>
            <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin">
              {bestResale.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>

          <DashboardSection title="Extreme Demand" count={extreme.length}
            action={<Link href="/dashboard/releases?priority=EXTREME" className="text-xs text-titan-accent hover:underline">View all</Link>}>
            <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin">
              {extreme.slice(0, 5).map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <DashboardSection title="Highest ROI" count={highestRoi.length}>
            <div className="grid sm:grid-cols-2 gap-2">
              {highestRoi.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>

          <DashboardSection title="Upcoming This Week" count={thisWeek.length}>
            <div className="grid sm:grid-cols-2 gap-2">
              {thisWeek.slice(0, 6).map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <DashboardSection title="New Since Last Scan" count={newSinceScan.length}>
            <div className="space-y-2">
              {newSinceScan.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>

          <DashboardSection title="Live Activity Feed">
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
              {activityFeed.map((item) => (
                <div key={item.id} className="p-2 rounded-lg bg-titan-bg border border-titan-border text-xs">
                  <div className="text-zinc-300">{item.text}</div>
                  {item.time && <div className="text-zinc-600 mt-0.5">{formatDistanceToNow(new Date(item.time), { addSuffix: true })}</div>}
                </div>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection title="AI Recommendations">
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-titan-bg border border-titan-border text-xs">
                <div className="flex items-center gap-1.5 text-red-400 mb-1"><AlertTriangle className="w-3.5 h-3.5" />Priority</div>
                <p className="text-zinc-400">{extreme.length} EXTREME releases. Top resale: {bestResale[0]?.title ?? "—"} (+{bestResale[0]?.expected_roi_mid ?? 0}% ROI est.)</p>
              </div>
              <div className="p-3 rounded-lg bg-titan-bg border border-titan-border text-xs">
                <div className="flex items-center gap-1.5 text-titan-accent mb-1"><Zap className="w-3.5 h-3.5" />Discovery</div>
                <p className="text-zinc-400">
                  Top focus: {topDiscovery.map((r) => r.title).join(" · ") || "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-titan-bg border border-titan-border text-xs">
                <div className="flex items-center gap-1.5 text-titan-accent mb-1"><Zap className="w-3.5 h-3.5" />Action</div>
                <p className="text-zinc-400">Monitor Nike/Jordan drops within 48h. Prepare accounts on official platforms only.</p>
              </div>
              {failedSources.length > 0 && (
                <Link href="/dashboard/sources" className="block p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs hover:border-red-500/40">
                  <div className="flex items-center gap-1.5 text-red-400"><XCircle className="w-3.5 h-3.5" />{failedSources.length} source(s) need attention</div>
                </Link>
              )}
            </div>
          </DashboardSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
