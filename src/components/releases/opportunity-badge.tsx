import { Badge, tierBadgeLabel } from "@/components/ui/badge";
import type { OpportunityAction } from "@/services/opportunity-engine.service";

export function OpportunityBadge({
  action,
  score,
  compact,
  showScore = true,
}: {
  action: OpportunityAction;
  score?: number;
  compact?: boolean;
  showScore?: boolean;
}) {
  const label = tierBadgeLabel(action);
  return (
    <span className="inline-flex items-center gap-1">
      {showScore && score != null && (
        <span className="text-[9px] font-mono text-titan-muted">{score}</span>
      )}
      <Badge variant="tier" label={label} compact={compact} />
    </span>
  );
}
