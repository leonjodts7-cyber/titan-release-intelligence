import { getReleases } from "@/lib/data/releases";
import { isWithinHours, isWithinDays } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardSection, StatCard } from "@/components/dashboard/section";
import { ReleaseCard } from "@/components/releases/release-card";
import { Activity, AlertTriangle, Radio, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const releases = await getReleases();
  const extreme = releases.filter((r) => r.priority_level === "EXTREME");
  const criticalNow = releases.filter(
    (r) => isWithinHours(r.release_starts_at, 24) || isWithinHours(r.presale_starts_at, 24)
  );
  const liveSoon = releases.filter(
    (r) => isWithinDays(r.release_starts_at, 7) && !isWithinHours(r.release_starts_at, 24)
  );
  const newAnnouncements = releases
    .filter((r) => r.announced_at && new Date(r.announced_at) > new Date(Date.now() - 7 * 86400000))
    .slice(0, 6);
  const presales = releases.filter((r) => r.presale_starts_at).slice(0, 6);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 max-w-[1600px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Command Center</h1>
            <p className="text-zinc-500 text-sm mt-1">Real-time release intelligence overview</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Activity className="w-4 h-4 text-green-500" />
            Pipeline active
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Releases" value={releases.length} />
          <StatCard label="EXTREME" value={extreme.length} color="text-red-400" />
          <StatCard label="Critical (<24h)" value={criticalNow.length} color="text-orange-400" />
          <StatCard label="This Week" value={liveSoon.length} color="text-titan-accent" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardSection title="Critical Now" subtitle="Releases within 24 hours" count={criticalNow.length}>
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

          <DashboardSection title="Live Soon" subtitle="Next 7 days" count={liveSoon.length}>
            <div className="space-y-2">
              {liveSoon.slice(0, 5).map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
        </div>

        <DashboardSection title="Extreme Demand" count={extreme.length}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {extreme.map((r) => <ReleaseCard key={r.id} release={r} />)}
          </div>
        </DashboardSection>

        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardSection title="New Announcements" count={newAnnouncements.length}>
            <div className="space-y-2">
              {newAnnouncements.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>

          <DashboardSection title="Presales" count={presales.length}>
            <div className="space-y-2">
              {presales.map((r) => <ReleaseCard key={r.id} release={r} compact />)}
            </div>
          </DashboardSection>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <DashboardSection title="Source Health">
            <div className="space-y-2">
              {[
                { name: "Ticketmaster", status: "healthy", score: 85 },
                { name: "Nike SNKRS", status: "healthy", score: 90 },
                { name: "UEFA", status: "healthy", score: 92 },
                { name: "Eventim", status: "degraded", score: 75 },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-titan-surface border border-titan-border text-sm">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-zinc-500" />
                    {s.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{s.score}%</span>
                    <span className={`w-2 h-2 rounded-full ${s.status === "healthy" ? "bg-green-500" : "bg-yellow-500"}`} />
                  </div>
                </div>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection title="Scan Activity">
            <div className="space-y-2 text-sm">
              {[
                { source: "Nike SNKRS", found: 2, created: 1, time: "2m ago" },
                { source: "Ticketmaster", found: 5, created: 0, time: "15m ago" },
                { source: "UEFA", found: 1, created: 0, time: "1h ago" },
              ].map((scan) => (
                <div key={scan.source} className="p-3 rounded-lg bg-titan-surface border border-titan-border">
                  <div className="flex justify-between">
                    <span>{scan.source}</span>
                    <span className="text-zinc-500 text-xs">{scan.time}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Found {scan.found} · Created {scan.created}
                  </div>
                </div>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection title="AI Insights">
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  High Alert
                </div>
                <p className="text-zinc-400 text-xs">
                  3 EXTREME releases this week. Nike Mercurial drop in &lt;24h — prepare SNKRS account.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm">
                <div className="flex items-center gap-2 text-titan-accent mb-1">
                  <Zap className="w-4 h-4" />
                  Trend
                </div>
                <p className="text-zinc-400 text-xs">
                  Football boot drops trending +40% this month. Champions League final tickets opening soon.
                </p>
              </div>
            </div>
          </DashboardSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
