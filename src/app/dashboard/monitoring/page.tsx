import { getMonitoringSnapshot } from "@/lib/data/monitoring";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { IntelStat } from "@/components/intelligence/intel-stat";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const snap = await getMonitoringSnapshot();

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Platform Monitoring</h1>
            <p className="text-[10px] text-zinc-500">Pipeline health · sources · alerts · intelligence coverage</p>
          </div>
          <span className="text-[10px] font-mono text-zinc-600">{new Date(snap.timestamp).toLocaleString()}</span>
        </div>

        <div className={snap.pipeline_healthy ? "intel-card border-emerald-500/20" : "intel-card border-red-500/30"}>
          <div className="text-xs font-medium mb-1">
            Pipeline: {snap.pipeline_healthy ? "Healthy" : "Degraded"}
          </div>
          <div className="text-[10px] text-zinc-500">
            DB {snap.db_connected ? "connected" : "demo"} · {snap.sources_failed} failed sources
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <IntelStat label="Releases" value={snap.releases_tracked} />
          <IntelStat label="Critical" value={snap.critical_opportunities} trend={snap.critical_opportunities > 0 ? "up" : "neutral"} />
          <IntelStat label="Sources Online" value={snap.sources_online} />
          <IntelStat label="Scans (1h)" value={snap.scans_last_hour} />
          <IntelStat label="Alerts (24h)" value={snap.alerts_triggered_24h} />
          <IntelStat label="Avg Opportunity" value={snap.avg_opportunity_score} />
          <IntelStat label="Profit Pool" value={`€${Math.round(snap.profit_pool_estimate / 1000)}k`} trend="up" />
          <IntelStat label="Failed Sources" value={snap.sources_failed} trend={snap.sources_failed > 0 ? "down" : "neutral"} />
        </div>

        <div className="flex gap-2 text-xs">
          <Link href="/dashboard/sources" className="text-titan-accent hover:underline">Sources →</Link>
          <Link href="/dashboard/alerts" className="text-titan-accent hover:underline">Alerts →</Link>
          <Link href="/dashboard/scans" className="text-titan-accent hover:underline">Scans →</Link>
        </div>
      </div>
    </IntelligenceLayout>
  );
}
