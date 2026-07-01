import { getSourceAdapters } from "@/lib/data/sources";
import { buildAllSourceIntelligence } from "@/lib/data/source-intelligence";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { SourceScanActions } from "./source-scan-actions";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = buildAllSourceIntelligence(await getSourceAdapters());

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 space-y-3 max-w-[1600px]">
        <div>
          <h1 className="text-lg font-bold">Source Intelligence</h1>
          <p className="text-[10px] text-zinc-500">{sources.length} adapters · latency · health · scan schedule</p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-titan-border">
          <table className="intel-table">
            <thead>
              <tr>
                <th>Source</th><th>Status</th><th>Priority</th><th>Interval</th><th>Latency</th><th>Health</th>
                <th>Success</th><th>Fail</th><th>Today</th><th>Week</th><th>Retry</th><th>Next Scan</th><th>Error</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source_id}>
                  <td className="font-medium">{s.source_id}</td>
                  <td className={s.status === "ONLINE" ? "text-emerald-400" : s.status === "DEGRADED" ? "text-yellow-400" : "text-red-400"}>{s.status}</td>
                  <td>{s.scan_priority}</td>
                  <td>{s.scan_interval_minutes}m</td>
                  <td>{s.latency_ms}ms</td>
                  <td>{s.health_score}</td>
                  <td>{s.success_pct}%</td>
                  <td>{s.failure_pct}%</td>
                  <td>{s.items_today}</td>
                  <td>{s.items_this_week}</td>
                  <td>{s.retry_count}</td>
                  <td className="text-[10px]">{s.next_scan_at ? new Date(s.next_scan_at).toLocaleTimeString() : "Due"}</td>
                  <td className="text-yellow-500 truncate max-w-[120px]">{s.last_error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceScanActions sources={sources} />
      </div>
    </IntelligenceLayout>
  );
}
