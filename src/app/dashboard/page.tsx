import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters, getScanJobs, getFailedSources } from "@/lib/data/sources";
import { isWithinHours, isWithinDays } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardSection, StatCard } from "@/components/dashboard/section";
import { ReleaseCard } from "@/components/releases/release-card";
import { Activity, AlertTriangle, Radio, Zap, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [releases, sources, scans, failedSources] = await Promise.all([
    getReleases(),
    getSourceAdapters(),
    getScanJobs(5),
    getFailedSources(),
  ]);

  const extreme = releases.filter((r) => r.priority_level === "EXTREME");
  const criticalNow = releases.filter(
    (r) => isWithinHours(r.release_starts_at, 24) || isWithinHours(r.presale_starts_at, 24)
  );
  const next24h = criticalNow;
  const newSinceScan = releases
    .filter((r) => r.created_at && new Date(r.created_at) > new Date(Date.now() - 24 * 3600000))
    .slice(0, 8);
  const healthySources = sources.filter((s) => s.enabled && !s.last_error);
  const lastScan = scans[0];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 max-w-[1600px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Command Center</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {lastScan?.source_adapters?.name
                ? `Last scan: ${lastScan.source_adapters.name} · ${lastScan.items_found} found`
                : "Real-time release intelligence"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Activity className="w-4 h-4 text-green-500" />
            Pipeline active
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" value={releases.length} />
          <StatCard label="EXTREME" value={extreme.length} color="text-red-400" />
          <StatCard label="Next 24h" value={next24h.length} color="text-orange-400" />
          <StatCard label="New (24h)" value={newSinceScan.length} color="text-titan-accent" />
          <StatCard label="Failed Sources" value={failedSources.length} color={failedSources.length ? "text-red-400" : undefined} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardSection
            title="Critical Now"
            subtitle="Within 24 hours"
            count={criticalNow.length}
            action={<Link href="/dashboard/releases?sort=date" className="text-xs text-titan-accent">View all</Link>}
          >
            <div className="space-y-2">
              {criticalNow.length > 0 ? (
                criticalNow.map((r) => <ReleaseCard key={r.id} release={r} compact />)
              ) : (
                <div className="p-4 text-sm text-zinc-500 border border-dashed border-titan-border rounded-xl">
                  No critical releases in the next 24 hours
                </div>
              )}
            </div>
          </DashboardSection>

          <DashboardSection title="New Since Last Scan" count={newSinceScan.length}>
            <div className="space-y-2">
              {newSinceScan.length > 0 ? (
                newSinceScan.map((r) => <ReleaseCard key={r.id} release={r} compact />)
              ) : (
                <div className="p-4 text-sm text-zinc-500 border border-dashed border-titan-border rounded-xl">
                  No new releases in the last 24 hours
                </div>
              )}
            </div>
          </DashboardSection>
        </div>

        <DashboardSection title="Extreme Demand" count={extreme.length}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {extreme.map((r) => <ReleaseCard key={r.id} release={r} />)}
          </div>
        </DashboardSection>

        <div className="grid lg:grid-cols-3 gap-6">
          <DashboardSection title="Source Health">
            <div className="space-y-1">
              {sources.slice(0, 8).map((s) => (
                <Link
                  key={s.id}
                  href="/dashboard/sources"
                  className="flex items-center justify-between p-3 rounded-lg bg-titan-surface border border-titan-border text-sm hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-zinc-500" />
                    {s.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{s.reliability_score}%</span>
                    <span className={`w-2 h-2 rounded-full ${s.last_error ? "bg-red-500" : s.enabled ? "bg-green-500" : "bg-zinc-600"}`} />
                  </div>
                </Link>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection title="Failed Sources" count={failedSources.length}>
            <div className="space-y-1">
              {failedSources.length > 0 ? failedSources.map((s) => (
                <Link
                  key={s.id}
                  href="/dashboard/sources"
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm hover:border-red-500/40"
                >
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div>{s.name}</div>
                    <div className="text-xs text-red-400/70 mt-0.5">{s.last_error}</div>
                  </div>
                </Link>
              )) : (
                <div className="p-4 text-sm text-zinc-500">All sources healthy</div>
              )}
            </div>
          </DashboardSection>

          <DashboardSection title="Scan Activity">
            <div className="space-y-1">
              {scans.map((scan) => (
                <Link
                  key={scan.id}
                  href="/dashboard/scans"
                  className="block p-3 rounded-lg bg-titan-surface border border-titan-border text-sm hover:border-zinc-600"
                >
                  <div className="flex justify-between">
                    <span>{scan.source_adapters?.name ?? "Unknown"}</span>
                    <span className={`text-xs ${scan.status === "failed" ? "text-red-400" : "text-zinc-500"}`}>
                      {scan.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Found {scan.items_found} · +{scan.items_created} · ~{scan.items_updated}
                    {scan.started_at && ` · ${formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}`}
                  </div>
                </Link>
              ))}
            </div>
          </DashboardSection>
        </div>

        <DashboardSection title="AI Insights">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                Priority Alert
              </div>
              <p className="text-zinc-400 text-xs">
                {extreme.length} EXTREME releases tracked.
                {criticalNow.length > 0 && ` ${criticalNow.length} starting within 24h.`}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm">
              <div className="flex items-center gap-2 text-titan-accent mb-1">
                <Zap className="w-4 h-4" />
                Source Status
              </div>
              <p className="text-zinc-400 text-xs">
                {healthySources.length}/{sources.filter((s) => s.enabled).length} sources healthy.
                {failedSources.length > 0 && ` ${failedSources.length} need attention.`}
              </p>
            </div>
          </div>
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
}
