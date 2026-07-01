import { cn } from "@/lib/utils";
import type { OpportunityAction } from "@/types";

const ACTION_STYLES: Record<OpportunityAction, string> = {
  "MUST WATCH": "bg-red-500/15 text-red-400 border-red-500/30",
  PRIORITY: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PREPARE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  WATCH: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IGNORE: "bg-zinc-500/10 text-zinc-500 border-zinc-600/30",
};

export function OpportunityBadge({
  action,
  score,
  compact,
}: {
  action: OpportunityAction;
  score?: number;
  compact?: boolean;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded border font-mono",
      compact ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0.5",
      ACTION_STYLES[action]
    )}>
      {score != null && <span>{score}</span>}
      <span>{action}</span>
    </span>
  );
}
