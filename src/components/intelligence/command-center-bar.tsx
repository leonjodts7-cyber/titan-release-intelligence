"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio, Activity, Brain, Database, Bell, ScanLine, AlertTriangle,
  TrendingUp, Zap, Layers, Calendar, Package,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatEur } from "@/lib/money";

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
        m.lastScanAt
          ? formatDistanceToNow(new Date(m.lastScanAt), { addSuffix: true, locale: nl })
          : "—"
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [m.lastScanAt]);

  const tiles = [
    { icon: Radio, label: t("command.sources"), value: `${m.sourcesOnline}/${m.sourcesTotal}`, href: "/dashboard/sources" },
    { icon: Activity, label: t("command.pipeline"), value: m.pipelineActive ? t("command.pipelineLive") : t("command.pipelineIdle"), ok: m.pipelineActive },
    { icon: Brain, label: t("command.ai"), value: m.aiActive ? t("command.aiActive") : t("command.aiRules"), ok: m.aiActive },
    { icon: Database, label: t("command.database"), value: m.dbConnected ? t("command.dbConnected") : t("command.dbDemo"), ok: m.dbConnected },
    { icon: Bell, label: t("command.unread"), value: String(m.unreadNotifications), href: "/dashboard/notifications", alert: m.unreadNotifications > 0 },
    { icon: ScanLine, label: t("command.scans"), value: String(m.scansToday), href: "/dashboard/scans" },
    { icon: Zap, label: t("command.changes"), value: String(m.changesToday) },
    { icon: AlertTriangle, label: t("command.critical"), value: String(m.criticalCount), href: "/dashboard/opportunities", alert: m.criticalCount > 0 },
    { icon: TrendingUp, label: t("command.opportunities"), value: String(m.opportunityCount), href: "/dashboard/opportunities" },
    { icon: TrendingUp, label: t("command.profitPool"), value: formatEur(m.profitPool), href: "/dashboard/opportunities" },
    { icon: TrendingUp, label: t("command.topRoi"), value: `${m.topRoi}%`, href: "/dashboard/opportunities" },
    { icon: Layers, label: t("command.topCategory"), value: truncate(m.topCategory), href: "/dashboard/analytics" },
    { icon: Calendar, label: t("command.topEvent"), value: truncate(m.topEvent), href: "/dashboard/releases" },
    { icon: Package, label: t("command.topProduct"), value: truncate(m.topProduct), href: "/dashboard/market" },
  ];

  return (
    <div className="command-center-bar">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-titan-border/60 text-[10px] text-titan-muted font-mono">
        <span>{t("app.live")}</span>
        <span>
          {t("command.lastScan")} {lastScanLabel}
          {" · "}{t("command.nextScan")} {nextScan}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 xl:grid-cols-14 gap-px bg-titan-border/40">
        {tiles.map(({ icon: Icon, label, value, ok, alert, href }) => {
          const inner = (
            <div className={cn(
              "command-tile bg-titan-surface px-2 py-2 hover:bg-white/[0.03] transition-colors h-full",
              alert && "bg-loss/5"
            )}>
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-titan-muted mb-0.5">
                <Icon className={cn("w-2.5 h-2.5", alert && "text-loss", ok === false && "text-warning")} />
                {label}
              </div>
              <div className={cn("text-[11px] font-mono font-semibold truncate tabular-nums", alert ? "text-loss" : "text-zinc-100")}>
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
