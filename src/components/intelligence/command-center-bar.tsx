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

export const DEFAULT_COMMAND_CENTER_METRICS: CommandCenterMetrics = {
  sourcesOnline: 0,
  sourcesTotal: 0,
  pipelineActive: false,
  aiActive: false,
  dbConnected: false,
  unreadNotifications: 0,
  scansToday: 0,
  changesToday: 0,
  criticalCount: 0,
  opportunityCount: 0,
  profitPool: 0,
  topRoi: 0,
  topCategory: "—",
  topEvent: "—",
  topProduct: "—",
  lastScanAt: null,
};

function truncate(value: string | null | undefined, max = 18): string {
  const text = value?.trim() || "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function CommandCenterBar({ metrics }: { metrics?: Partial<CommandCenterMetrics> }) {
  const m = { ...DEFAULT_COMMAND_CENTER_METRICS, ...metrics };
  const [nextScan, setNextScan] = useState("…");
  const [lastScanLabel, setLastScanLabel] = useState("—");

  useEffect(() => {
    const tick = () => {
      const cron = 15;
      const mins = new Date().getMinutes();
      const secs = new Date().getSeconds();
      setNextScan(`${cron - (mins % cron)}m ${60 - secs}s`);
      setLastScanLabel(
        m.lastScanAt ? formatDistanceToNow(new Date(m.lastScanAt), { addSuffix: true }) : "—"
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [m.lastScanAt]);

  const tiles = [
    { icon: Radio, label: "Sources", value: `${m.sourcesOnline}/${m.sourcesTotal}`, href: "/dashboard/sources" },
    { icon: Activity, label: "Pipeline", value: m.pipelineActive ? "Live" : "Idle", ok: m.pipelineActive },
    { icon: Brain, label: "AI", value: m.aiActive ? "Active" : "Rules", ok: m.aiActive },
    { icon: Database, label: "Database", value: m.dbConnected ? "Connected" : "Demo", ok: m.dbConnected },
    { icon: Bell, label: "Unread", value: String(m.unreadNotifications), href: "/dashboard/notifications", alert: m.unreadNotifications > 0 },
    { icon: ScanLine, label: "Scans", value: String(m.scansToday), href: "/dashboard/scans" },
    { icon: Zap, label: "Changes", value: String(m.changesToday) },
    { icon: AlertTriangle, label: "Critical", value: String(m.criticalCount), href: "/dashboard/opportunities", alert: m.criticalCount > 0 },
    { icon: TrendingUp, label: "Opportunities", value: String(m.opportunityCount), href: "/dashboard/opportunities" },
    { icon: TrendingUp, label: "Profit Pool", value: `€${Math.round(m.profitPool).toLocaleString()}`, href: "/dashboard/opportunities" },
    { icon: TrendingUp, label: "Top ROI", value: `${m.topRoi}%`, href: "/dashboard/opportunities" },
    { icon: Layers, label: "Top Category", value: truncate(m.topCategory), href: "/dashboard/analytics" },
    { icon: Calendar, label: "Top Event", value: truncate(m.topEvent), href: "/dashboard/releases" },
    { icon: Package, label: "Top Product", value: truncate(m.topProduct), href: "/dashboard/market" },
  ];

  return (
    <div className="command-center-bar">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-titan-border/60 text-[10px] text-zinc-500 font-mono">
        <span>TITAN INTELLIGENCE · LIVE</span>
        <span>
          Last scan {lastScanLabel}
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
