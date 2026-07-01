"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio, Activity, Brain, Database, Bell, ScanLine, AlertTriangle,
  TrendingUp, Zap, Layers, Calendar, Package,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface CommandCenterMetrics {
  sourcesOnline: number;
  sourcesTotal: number;
  pipelineActive: boolean;
  aiActive: boolean;
  dbConnected: boolean;
  unreadNotifications: number;
  scansToday: number;
  changesToday: number;
  criticalCount: number;
  opportunityCount: number;
  profitPool: number;
  topRoi: number;
  topCategory: string;
  topEvent: string;
  topProduct: string;
  lastScanAt: string | null;
}

export function CommandCenterBar({ metrics }: { metrics: CommandCenterMetrics }) {
  const [nextScan, setNextScan] = useState("—");

  useEffect(() => {
    const tick = () => {
      const cron = 15;
      const m = new Date().getMinutes();
      const s = new Date().getSeconds();
      setNextScan(`${cron - (m % cron)}m ${60 - s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const tiles = [
    { icon: Radio, label: "Sources", value: `${metrics.sourcesOnline}/${metrics.sourcesTotal}`, href: "/dashboard/sources" },
    { icon: Activity, label: "Pipeline", value: metrics.pipelineActive ? "Live" : "Idle", ok: metrics.pipelineActive },
    { icon: Brain, label: "AI", value: metrics.aiActive ? "Active" : "Rules", ok: metrics.aiActive },
    { icon: Database, label: "Database", value: metrics.dbConnected ? "Connected" : "Demo", ok: metrics.dbConnected },
    { icon: Bell, label: "Unread", value: String(metrics.unreadNotifications), href: "/dashboard/notifications", alert: metrics.unreadNotifications > 0 },
    { icon: ScanLine, label: "Scans", value: String(metrics.scansToday), href: "/dashboard/scans" },
    { icon: Zap, label: "Changes", value: String(metrics.changesToday) },
    { icon: AlertTriangle, label: "Critical", value: String(metrics.criticalCount), href: "/dashboard/opportunities", alert: metrics.criticalCount > 0 },
    { icon: TrendingUp, label: "Opportunities", value: String(metrics.opportunityCount), href: "/dashboard/opportunities" },
    { icon: TrendingUp, label: "Profit Pool", value: `€${Math.round(metrics.profitPool).toLocaleString()}`, href: "/dashboard/opportunities" },
    { icon: TrendingUp, label: "Top ROI", value: `${metrics.topRoi}%`, href: "/dashboard/opportunities" },
    { icon: Layers, label: "Top Category", value: metrics.topCategory, href: "/dashboard/analytics" },
    { icon: Calendar, label: "Top Event", value: metrics.topEvent.slice(0, 18), href: "/dashboard/releases" },
    { icon: Package, label: "Top Product", value: metrics.topProduct.slice(0, 18), href: "/dashboard/market" },
  ];

  return (
    <div className="command-center-bar">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-titan-border/60 text-[10px] text-zinc-500 font-mono">
        <span>TITAN INTELLIGENCE · LIVE</span>
        <span>
          Last scan {metrics.lastScanAt ? formatDistanceToNow(new Date(metrics.lastScanAt), { addSuffix: true }) : "—"}
          {" · "}Next {nextScan}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 xl:grid-cols-14 gap-px bg-titan-border/40">
        {tiles.map(({ icon: Icon, label, value, ok, alert, href }) => {
          const inner = (
            <div className={cn(
              "command-tile bg-titan-surface px-2 py-2 hover:bg-white/[0.03] transition-colors h-full",
              alert && "bg-red-500/[0.04]"
            )}>
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">
                <Icon className={cn("w-2.5 h-2.5", alert && "text-red-400", ok === false && "text-yellow-400")} />
                {label}
              </div>
              <div className={cn("text-[11px] font-mono font-semibold truncate", alert ? "text-red-400" : "text-zinc-100")}>
                {value}
              </div>
            </div>
          );
          return href ? <Link key={label} href={href}>{inner}</Link> : <div key={label}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
