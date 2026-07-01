import { getReleases } from "@/lib/data/releases";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReleaseCard } from "@/components/releases/release-card";
import { formatDate, formatCountdown } from "@/lib/utils";
import { isWithinDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const releases = await getReleases({ sort: "date" });
  const today = releases.filter((r) => isWithinDays(r.release_starts_at, 1));
  const thisWeek = releases.filter((r) => isWithinDays(r.release_starts_at, 7));
  const extreme = releases.filter((r) => r.priority_level === "EXTREME");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-[1600px] space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-zinc-500 text-sm mt-1">Automated release calendar with countdowns</p>
        </div>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Today</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {today.length > 0 ? today.map((r) => <ReleaseCard key={r.id} release={r} />) : (
              <p className="text-zinc-500 text-sm col-span-full">No releases today</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">This Week</h2>
          <div className="space-y-2">
            {thisWeek.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-titan-surface border border-titan-border">
                <div>
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{formatDate(r.release_starts_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-titan-accent">{formatCountdown(r.release_starts_at)}</div>
                  <div className="text-xs text-zinc-500">{r.priority_level}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">EXTREME Only</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {extreme.map((r) => <ReleaseCard key={r.id} release={r} />)}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
