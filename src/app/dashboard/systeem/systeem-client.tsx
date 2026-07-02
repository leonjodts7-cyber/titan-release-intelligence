"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { MonitoringSnapshot } from "@/lib/data/monitoring";
import type { SourceAdapter, ScanJob } from "@/types";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
}: {
  monitoring: MonitoringSnapshot;
  sources: SourceAdapter[];
  scans: ScanJob[];
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
        <div className="space-y-3">
          <div className={monitoring.pipeline_healthy ? "intel-card border-emerald-500/20" : "intel-card border-red-500/30"}>
            <p className="text-xs">
              Pipeline: {monitoring.pipeline_healthy ? "Gezond" : "Verstoord"}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <IntelStat label="Releases" value={monitoring.releases_tracked} />
            <IntelStat label={t("dashboard.critical")} value={monitoring.critical_opportunities} />
            <IntelStat label="Bronnen online" value={monitoring.sources_online} />
            <IntelStat label="Scans (1u)" value={monitoring.scans_last_hour} />
          </div>
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
}) {
  return (
    <Suspense>
      <SysteemTabs {...props} />
    </Suspense>
  );
}
