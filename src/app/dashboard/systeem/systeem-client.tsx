"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { MonitoringSnapshot } from "@/lib/data/monitoring";
import type { SourceAdapter, ScanJob } from "@/types";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { t } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import { RefreshIngestButton } from "@/app/dashboard/systeem/refresh-ingest-button";

const TABS = [
  { id: "monitoring", labelKey: "systeem.tabMonitoring", href: "/dashboard/systeem" },
  { id: "bronnen", labelKey: "systeem.tabSources", href: "/dashboard/systeem?tab=bronnen" },
  { id: "scans", labelKey: "systeem.tabScans", href: "/dashboard/systeem?tab=scans" },
  { id: "beheer", labelKey: "systeem.tabAdmin", href: "/dashboard/systeem?tab=beheer" },
] as const;

function SysteemTabs({
  monitoring,
  sources,
  scans,
  health,
}: {
  monitoring: MonitoringSnapshot;
  sources: SourceAdapter[];
  scans: ScanJob[];
  health?: { mode: string; database: { reachable: boolean; releaseCount: number | null } };
}) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "monitoring";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-titan-border p-0.5 w-fit text-xs">
        {TABS.map((tb) => (
          <Link
            key={tb.id}
            href={tb.href}
            className={cn(
              "px-3 py-1.5 rounded-md",
              tab === tb.id ? "bg-titan-accent/15 text-titan-accent" : "text-titan-muted"
            )}
          >
            {t(tb.labelKey)}
          </Link>
        ))}
      </div>

      {tab === "monitoring" && (
        <div className="space-y-4">
          <div className={monitoring.pipeline_healthy ? "intel-card border-emerald-500/20" : "intel-card border-red-500/30"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs">
                Pipeline: {monitoring.pipeline_healthy ? "Gezond" : "Verstoord"}
                {health && (
                  <span className="text-titan-muted ml-2">
                    · {health.mode === "live" ? "Live data" : "Demo data"}
                    {health.database.releaseCount != null && ` · ${health.database.releaseCount} releases`}
                  </span>
                )}
                {monitoring.last_ingest_at && (
                  <span className="text-titan-muted ml-2">
                    · {t("today.lastIngest", { when: formatDate(monitoring.last_ingest_at) })}
                  </span>
                )}
              </p>
              <RefreshIngestButton />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <IntelStat label="Releases" value={monitoring.releases_tracked} />
            <IntelStat label={t("dashboard.critical")} value={monitoring.critical_opportunities} />
            <IntelStat label="Bronnen online" value={monitoring.sources_online} />
            <IntelStat label="Scans (1u)" value={monitoring.scans_last_hour} />
          </div>

          <section>
            <h3 className="intel-section-title mb-2">{t("systeem.tabSources")}</h3>
            <div className="overflow-x-auto rounded-lg border border-titan-border">
              <table className="w-full text-xs">
                <thead className="bg-titan-bg text-titan-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{t("systeem.sourceName")}</th>
                    <th className="text-left px-3 py-2 font-medium">{t("systeem.sourceStatus")}</th>
                    <th className="text-left px-3 py-2 font-medium">{t("systeem.sourceLastScan")}</th>
                    <th className="text-right px-3 py-2 font-medium">{t("systeem.sourceItemsFound")}</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoring.source_rows.map((row) => (
                    <tr key={row.id} className="border-t border-titan-border">
                      <td className="px-3 py-2">{row.name}</td>
                      <td className={cn("px-3 py-2", row.online ? "text-emerald-400" : "text-red-400")}>
                        {row.online ? t("systeem.online") : t("systeem.offline")}
                      </td>
                      <td className="px-3 py-2 text-titan-muted font-mono">
                        {row.last_scan_at ? formatDate(row.last_scan_at) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{row.items_found}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="intel-section-title mb-2">{t("systeem.recentScans")}</h3>
            <ul className="space-y-1 text-xs">
              {monitoring.recent_scan_logs.map((log) => (
                <li key={log.id} className="px-3 py-2 rounded-lg border border-titan-border bg-titan-surface flex justify-between gap-2">
                  <span>
                    <span className="text-titan-muted">{log.source_name}</span> — {log.message}
                  </span>
                  <span className="text-titan-muted font-mono shrink-0">{formatDate(log.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="intel-section-title mb-2">{t("systeem.errors24h")}</h3>
            {monitoring.errors_24h.length === 0 ? (
              <p className="text-xs text-titan-muted">{t("systeem.noErrors")}</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {monitoring.errors_24h.map((log) => (
                  <li key={log.id} className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/5 text-red-300">
                    <span className="font-medium">{log.source_name}</span> — {log.message}
                    <span className="text-titan-muted ml-2 font-mono">{formatDate(log.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "bronnen" && (
        <ul className="space-y-1 text-xs">
          {sources.map((s) => (
            <li key={s.id} className="flex justify-between px-3 py-2 rounded-lg border border-titan-border bg-titan-surface">
              <span>{s.name}</span>
              <span className="text-titan-muted">{s.enabled ? (s.last_error ? "fout" : "online") : "uit"}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === "scans" && (
        <ul className="space-y-1 text-xs font-mono">
          {scans.map((s) => (
            <li key={s.id} className="px-3 py-2 rounded-lg border border-titan-border bg-titan-surface flex justify-between">
              <span>{s.source_adapter_id}</span>
              <span className="text-titan-muted">{s.status}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === "beheer" && (
        <div className="intel-card text-xs space-y-2">
          <p>Beheer en export via het admin-paneel.</p>
          <Link href="/dashboard/admin" className="text-titan-accent hover:underline">
            Open beheer →
          </Link>
        </div>
      )}
    </div>
  );
}

export function SysteemClient(props: {
  monitoring: MonitoringSnapshot;
  sources: SourceAdapter[];
  scans: ScanJob[];
  health?: { mode: string; database: { reachable: boolean; releaseCount: number | null } };
}) {
  return (
    <Suspense>
      <SysteemTabs {...props} />
    </Suspense>
  );
}
