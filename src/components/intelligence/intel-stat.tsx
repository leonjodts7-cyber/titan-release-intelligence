import { cn } from "@/lib/utils";

interface IntelStatProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  compact?: boolean;
  className?: string;
}

export function IntelStat({ label, value, sub, trend, compact, className }: IntelStatProps) {
  return (
    <div className={cn("intel-stat", compact && "intel-stat-compact", className)}>
      <div className="intel-stat-label">{label}</div>
      <div className={cn("intel-stat-value", trend === "up" && "text-emerald-400", trend === "down" && "text-red-400")}>
        {value}
      </div>
      {sub && <div className="intel-stat-sub">{sub}</div>}
    </div>
  );
}
