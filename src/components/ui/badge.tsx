import { cn } from "@/lib/utils";
import type { OpportunityAction } from "@/types";

const TIER_STYLES: Record<string, string> = {
  TOP: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
  "MUST WATCH": "bg-red-500/15 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  WATCH: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IGNORE: "bg-zinc-500/10 text-zinc-500 border-zinc-600/30",
};

const PRIORITY_STYLES: Record<string, string> = {
  EXTREME: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-green-500/20 text-green-400 border-green-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  holding: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  listed: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  sold: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  announced: "bg-zinc-500/10 text-zinc-400 border-zinc-600/30",
  on_sale: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  sold_out: "bg-red-500/15 text-red-300 border-red-500/30",
};

export type BadgeVariant = "tier" | "priority" | "status" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  compact?: boolean;
  className?: string;
}

export function Badge({ variant = "neutral", label, compact, className }: BadgeProps) {
  const styles =
    variant === "tier" ? TIER_STYLES[label] :
    variant === "priority" ? PRIORITY_STYLES[label] :
    variant === "status" ? STATUS_STYLES[label] :
    "bg-zinc-500/10 text-zinc-400 border-zinc-600/30";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-mono whitespace-nowrap",
        compact ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0.5",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}

export function tierBadgeLabel(action: OpportunityAction): string {
  const map: Record<OpportunityAction, string> = {
    "TOP OPPORTUNITY": "TOP",
    "MUST WATCH": "MUST WATCH",
    "HIGH PRIORITY": "HIGH",
    PRIORITY: "HIGH",
    PREPARE: "WATCH",
    WATCH: "WATCH",
    IGNORE: "IGNORE",
  };
  return map[action] ?? action;
}
