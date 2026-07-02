"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface MiniChartProps {
  data: number[];
  height?: number;
  className?: string;
  positive?: boolean;
  showTooltip?: boolean;
  periods?: { label: string; days: 7 | 30 | 90 }[];
  onPeriodChange?: (days: 7 | 30 | 90) => void;
  activePeriod?: 7 | 30 | 90;
}

export function MiniChart({
  data,
  height = 48,
  className = "",
  positive,
  showTooltip = false,
  periods,
  onPeriodChange,
  activePeriod,
}: MiniChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradId = useId();

  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100 / (data.length - 1 || 1);
  const trend = data[data.length - 1] >= data[0];
  const up = positive !== undefined ? positive : trend;
  const stroke = up ? "var(--titan-profit)" : "var(--titan-loss)";

  const points = data
    .map((v, i) => {
      const x = i * w;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn("relative", className)}>
      {periods && onPeriodChange && (
        <div className="flex gap-1 mb-1">
          {periods.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPeriodChange(p.days);
              }}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded border font-mono",
                activePeriod === p.days
                  ? "border-titan-accent text-titan-accent bg-titan-accent/10"
                  : "border-titan-border text-titan-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 100 ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill={`url(#${gradId})`} stroke="none" points={`0,${height} ${points} 100,${height}`} />
        <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />
        {showTooltip &&
          data.map((v, i) => {
            const x = i * w;
            const y = height - ((v - min) / range) * (height - 4) - 2;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={hoverIdx === i ? 2.5 : 0}
                fill={stroke}
                onMouseEnter={() => setHoverIdx(i)}
              />
            );
          })}
      </svg>
      {showTooltip && hoverIdx != null && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-titan-surface-raised border border-titan-border px-1.5 py-0.5 rounded whitespace-nowrap z-10">
          €{data[hoverIdx].toLocaleString("nl-BE")} · min €{min.toLocaleString("nl-BE")} · max €{max.toLocaleString("nl-BE")}
        </div>
      )}
    </div>
  );
}

export const CHART_PERIODS = [
  { label: t("market.period7d"), days: 7 as const },
  { label: t("market.period30d"), days: 30 as const },
  { label: t("market.period90d"), days: 90 as const },
];
