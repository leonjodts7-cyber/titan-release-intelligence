import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters } from "@/lib/data/sources";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { buildAllSourceIntelligence } from "@/lib/data/source-intelligence";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { MiniChart } from "@/components/intelligence/mini-chart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const releases = enrichReleases(await getReleases());
  const sources = buildAllSourceIntelligence(await getSourceAdapters());

  const byCategory: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  releases.forEach((r) => {
    const cat = r.release_categories?.name ?? "Other";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    const co = r.countries?.code ?? "XX";
    byCountry[co] = (byCountry[co] ?? 0) + 1;
  });

  const avgRoi = Math.round(releases.reduce((s, r) => s + (r.expected_roi_mid ?? 0), 0) / releases.length);
  const avgProfit = Math.round(releases.reduce((s, r) => s + (r.expected_profit_mid ?? 0), 0) / releases.length);

  const actionDist: Record<string, number> = {};
  releases.forEach((r) => { actionDist[r.opportunity_action] = (actionDist[r.opportunity_action] ?? 0) + 1; });

  const roiBuckets = [0, 0, 0, 0];
  releases.forEach((r) => {
    const roi = r.expected_roi_mid ?? 0;
    if (roi >= 100) roiBuckets[3]++;
    else if (roi >= 50) roiBuckets[2]++;
    else if (roi >= 20) roiBuckets[1]++;
    else roiBuckets[0]++;
  });

  const dailyReleases = Array.from({ length: 14 }, (_, i) =>
    releases.filter((r) => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      const day = new Date(Date.now() - i * 86400000);
      return d.toDateString() === day.toDateString();
    }).length
  ).reverse();

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 space-y-4 max-w-[1600px]">
        <div>
          <h1 className="text-lg font-bold">Analytics</h1>
          <p className="text-[10px] text-zinc-500">Platform intelligence metrics · distributions · source reliability</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5">
          <IntelStat label="Total Releases" value={releases.length} />
          <IntelStat label="Avg ROI" value={`${avgRoi}%`} trend="up" />
          <IntelStat label="Avg Profit" value={`€${avgProfit}`} />
          <IntelStat label="Top Opp." value={actionDist["TOP OPPORTUNITY"] ?? 0} />
          <IntelStat label="Must Watch" value={actionDist["MUST WATCH"] ?? 0} />
          <IntelStat label="Sources OK" value={`${sources.filter((s) => s.status === "ONLINE").length}/${sources.length}`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="intel-card">
            <div className="intel-section-title mb-2">Releases per Day (14d)</div>
            <MiniChart data={dailyReleases.length ? dailyReleases : [1, 2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, releases.length % 10]} height={64} />
          </div>
          <div className="intel-card">
            <div className="intel-section-title mb-2">ROI Distribution</div>
            <div className="grid grid-cols-4 gap-2">
              {["0-20%", "20-50%", "50-100%", "100%+"].map((l, i) => (
                <IntelStat key={l} label={l} value={roiBuckets[i]} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="intel-card">
            <div className="intel-section-title mb-2">By Category</div>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-zinc-400">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="intel-card">
            <div className="intel-section-title mb-2">By Country</div>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-zinc-400">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="intel-card">
          <div className="intel-section-title mb-2">Source Reliability</div>
          <div className="overflow-x-auto">
            <table className="intel-table">
              <thead>
                <tr>
                  <th>Source</th><th>Status</th><th>Success</th><th>Latency</th><th>Today</th><th>Week</th><th>Health</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source_id}>
                    <td>{s.source_id}</td>
                    <td className={s.status === "ONLINE" ? "text-emerald-400" : s.status === "DEGRADED" ? "text-yellow-400" : "text-red-400"}>{s.status}</td>
                    <td>{s.success_pct}%</td>
                    <td>{s.latency_ms}ms</td>
                    <td>{s.items_today}</td>
                    <td>{s.items_this_week}</td>
                    <td>{s.health_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </IntelligenceLayout>
  );
}
