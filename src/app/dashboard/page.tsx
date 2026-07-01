import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import {
  enrichReleases, getTopResaleOpportunities, sortByRoi, getTotalProfitOpportunity,
  getMustWatch, getTcgOpportunities, getSneakerDrops, getTicketOpportunities, sortByOpportunity,
} from "@/lib/data/enrich-releases";
import { isWithinHours, isWithinDays } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardSection } from "@/components/dashboard/section";
import { ReleaseCard } from "@/components/releases/release-card";
import { CommandBar } from "@/components/dashboard/command-bar";
import { AlertTriangle, Zap, XCircle, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { aiRecommendationService } from "@/services/ai-recommendation.service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [rawReleases, sources, scans, failedSources] = await Promise.all([
    getReleases(),
    getSourceAdapters(),
    getScanJobs(8),
    getFailedSources(),
  ]);

  const releases = enrichReleases(rawReleases);
  const mustWatch = getMustWatch(releases, 6);
  const bestResale = getTopResaleOpportunities(releases, 6);
  const highestRoi = sortByRoi(releases).slice(0, 6);
  const next24h = releases.filter(
    (r) => isWithinHours(r.release_starts_at, 24) || isWithinHours(r.presale_starts_at, 24)
  );
  const extreme = releases.filter((r) => r.priority_level === "EXTREME");
  const tcgOps = getTcgOpportunities(releases, 4);
  const sneakerDrops = getSneakerDrops(releases, 4);
  const ticketOps = getTicketOpportunities(releases, 4);
  const newSinceScan = releases
    .filter((r) => r.created_at && new Date(r.created_at) > new Date(Date.now() - 24 * 3600000))
    .slice(0, 4);
  const priceMovement = sortByOpportunity(releases)
    .filter((r) => r.last_changed_at)
    .slice(0, 5);
  const healthySources = sources.filter((s) => s.enabled && !s.last_error);
  const lastScan = scans[0];
  const profitPool = getTotalProfitOpportunity(releases);
  const topRoi = sortByRoi(releases)[0]?.expected_roi_mid ?? 0;
  const topRelease = sortByOpportunity(releases)[0];
  const topAiRec = topRelease ? aiRecommendationService.generate(topRelease) : null;

  const activityFeed = [
    ...scans.slice(0, 4).map((s) => ({
      id: s.id,
      text: `${s.source_adapters?.name}: ${s.status} — found ${s.items_found}, +${s.items_created} new`,
      time: s.started_at,
    })),
    ...newSinceScan.slice(0, 2).map((r) => ({
      id: r.id,
      text: `New: ${r.title} [${r.opportunity_action}]`,
      time: r.created_at,
    })),
  ].sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime());

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-[1800px]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Deal Execution Command Center</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            {releases.length} opportunities · tickets · sneakers · TCG · collectibles
          </p>
        </div>

        <CommandBar
          sourcesOnline={healthySources.length}
          sourcesTotal={sources.filter((s) => s.enabled).length}
          lastScanAt={lastScan?.started_at ?? sources[0]?.last_scan_at ?? null}
          failedSources={failedSources.length}
          criticalAlerts={mustWatch.length}
          releasesToday={next24h.length}
          profitOpportunity={profitPool}
          topRoi={topRoi}
        />

        <div className="grid lg:grid-cols-3 gap-3">
          <DashboardSection title="Must Watch Now" count={mustWatch.length}
            action={<Link href="/dashboard/opportunities" className="text-xs text-titan-accent hover:underline">Rank all</Link>}>
            <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin">
              {mustWatch.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
          <DashboardSection title="Best Resale Opportunities" count={bestResale.length}
            action={<Link href="/dashboard/opportunities?sort=profit" className="text-xs text-titan-accent hover:underline">View all</Link>}>
            <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin">
              {bestResale.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
          <DashboardSection title="Highest ROI" count={highestRoi.length}
            action={<Link href="/dashboard/releases?sort=roi" className="text-xs text-titan-accent hover:underline">View all</Link>}>
            <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin">
              {highestRoi.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-4 gap-3">
          <DashboardSection title="Next 24 Hours" count={next24h.length}>
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
              {next24h.slice(0, 4).map((r) => <ReleaseCard key={r.id} release={r} compact />)}
              {next24h.length === 0 && <p className="text-xs text-zinc-500">Nothing in 24h</p>}
            </div>
          </DashboardSection>
          <DashboardSection title="Extreme Demand" count={extreme.length}>
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
              {extreme.slice(0, 4).map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
          <DashboardSection title="Pokémon / TCG" count={tcgOps.length}>
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
              {tcgOps.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
          <DashboardSection title="Sneaker Drops" count={sneakerDrops.length}>
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
              {sneakerDrops.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-3 gap-3">
          <DashboardSection title="Ticket Opportunities" count={ticketOps.length}>
            <div className="space-y-2">
              {ticketOps.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
          <DashboardSection title="Live Activity Feed">
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
              {activityFeed.map((item) => (
                <div key={item.id} className="p-2 rounded-lg bg-titan-bg border border-titan-border text-xs">
                  <div className="text-zinc-300">{item.text}</div>
                  {item.time && <div className="text-zinc-600 mt-0.5">{formatDistanceToNow(new Date(item.time), { addSuffix: true })}</div>}
                </div>
              ))}
            </div>
          </DashboardSection>
          <DashboardSection title="Source Health"
            action={<Link href="/dashboard/sources" className="text-xs text-titan-accent hover:underline">Manage</Link>}>
            <div className="space-y-1.5">
              {sources.slice(0, 6).map((s) => (
                <div key={s.id} className="flex justify-between p-2 rounded-lg bg-titan-bg border border-titan-border text-xs">
                  <span className={s.last_error ? "text-red-400" : "text-zinc-300"}>{s.name}</span>
                  <span className="text-zinc-500">{s.reliability_score}% · {s.scan_frequency_minutes}m</span>
                </div>
              ))}
              {failedSources.length > 0 && (
                <Link href="/dashboard/sources" className="block p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-400">
                  {failedSources.length} failed — retry with backoff
                </Link>
              )}
            </div>
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <DashboardSection title="AI Recommendations">
            <div className="space-y-2">
              {topAiRec && (
                <div className="p-3 rounded-lg bg-titan-bg border border-titan-border text-xs">
                  <div className="flex items-center gap-1.5 text-red-400 mb-1"><AlertTriangle className="w-3.5 h-3.5" />Top Pick</div>
                  <p className="text-zinc-300 leading-relaxed">{topAiRec.full_summary}</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-titan-bg border border-titan-border text-xs">
                <div className="flex items-center gap-1.5 text-titan-accent mb-1"><Zap className="w-3.5 h-3.5" />Monitor</div>
                <p className="text-zinc-400">Track SNKRS/Confirmed drops, TCG restocks, and presale windows. Use official links only — no checkout automation.</p>
              </div>
              {failedSources.length > 0 && (
                <Link href="/dashboard/sources" className="block p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs hover:border-red-500/40">
                  <div className="flex items-center gap-1.5 text-red-400"><XCircle className="w-3.5 h-3.5" />{failedSources.length} source(s) need attention</div>
                </Link>
              )}
            </div>
          </DashboardSection>
          <DashboardSection title="Price Movement Feed">
            <div className="space-y-1.5">
              {priceMovement.map((r) => (
                <Link key={r.id} href={`/dashboard/releases/${r.id}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-titan-bg border border-titan-border text-xs hover:border-zinc-600">
                  <span className="truncate flex-1">{r.title}</span>
                  <span className="flex items-center gap-2 shrink-0 ml-2">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="font-mono text-green-400">+{r.expected_roi_mid ?? 0}%</span>
                  </span>
                </Link>
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
