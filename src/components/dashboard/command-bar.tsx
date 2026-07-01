"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Radio, Clock, AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CommandBarProps {
  sourcesOnline: number;
  sourcesTotal: number;
  lastScanAt: string | null;
  failedSources: number;
  criticalAlerts: number;
  releasesToday: number;
  profitOpportunity: number;
  topRoi: number;
  pipelineActive?: boolean;
}

export function CommandBar({
  sourcesOnline,
  sourcesTotal,
  lastScanAt,
  failedSources,
  criticalAlerts,
  releasesToday,
  profitOpportunity,
  topRoi,
  pipelineActive = true,
}: CommandBarProps) {
  const [nextScanIn, setNextScanIn] = useState("15m");

  useEffect(() => {
    const interval = setInterval(() => {
      const cronMinutes = 15;
      const now = new Date();
      const mins = now.getMinutes();
      const nextMin = cronMinutes - (mins % cronMinutes);
      const secs = 60 - now.getSeconds();
      setNextScanIn(nextMin <= 0 ? `${cronMinutes}m` : `${nextMin}m ${secs}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { icon: Radio, label: "Sources", value: `${sourcesOnline}/${sourcesTotal}`, ok: failedSources === 0, href: "/dashboard/sources" },
    { icon: Clock, label: "Last scan", value: lastScanAt ? formatDistanceToNow(new Date(lastScanAt), { addSuffix: true }) : "—", href: "/dashboard/scans" },
    { icon: Zap, label: "Next scan", value: nextScanIn, href: "/dashboard/scans" },
    { icon: Activity, label: "Pipeline", value: pipelineActive ? "Active" : "Idle", ok: pipelineActive },
    { icon: AlertTriangle, label: "Critical", value: String(criticalAlerts), alert: criticalAlerts > 0, href: "/dashboard/opportunities" },
    { icon: Clock, label: "Opportunities", value: String(releasesToday), href: "/dashboard/opportunities" },
    { icon: TrendingUp, label: "Est. profit pool", value: `€${Math.round(profitOpportunity).toLocaleString()}`, href: "/dashboard/releases?sort=roi" },
    { icon: TrendingUp, label: "Top ROI", value: `${topRoi}%`, href: "/dashboard/releases?sort=roi" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-3 rounded-xl bg-titan-surface border border-titan-border">
      {items.map(({ icon: Icon, label, value, ok, alert, href }) => {
        const content = (
          <div className={cn(
            "p-2 rounded-lg hover:bg-white/5 transition-colors",
            alert && "bg-red-500/5 border border-red-500/20"
          )}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
              <Icon className={cn("w-3 h-3", ok === false && "text-red-400", alert && "text-red-400")} />
              {label}
            </div>
            <div className={cn("text-sm font-mono font-semibold truncate", alert ? "text-red-400" : "text-zinc-200")}>
              {value}
            </div>
          </div>
        );
        return href ? (
          <Link key={label} href={href}>{content}</Link>
        ) : (
          <div key={label}>{content}</div>
        );
      })}
    </div>
  );
}
