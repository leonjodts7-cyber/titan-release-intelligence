import type { OpportunityAction } from "@/services/opportunity-engine.service";

export interface ScoringComponents {
  demand: number;
  netMarginScore: number;
  scarcity: number;
  liquidity: number;
  momentum: number;
}

export function computeOpportunityScoreV2(c: ScoringComponents): number {
  const raw =
    0.3 * c.demand +
    0.25 * c.netMarginScore +
    0.2 * c.scarcity +
    0.15 * c.liquidity +
    0.1 * c.momentum;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function assignTierByRank(rankIndex: number, total: number): OpportunityAction {
  if (total <= 0) return "IGNORE";
  const topCount = Math.max(1, Math.ceil(total * 0.05));
  const mustCount = Math.max(topCount, Math.ceil(total * 0.15));
  const highCount = Math.max(mustCount, Math.ceil(total * 0.35));
  const watchCount = Math.max(highCount, Math.ceil(total * 0.6));

  if (rankIndex < topCount) return "TOP OPPORTUNITY";
  if (rankIndex < mustCount) return "MUST WATCH";
  if (rankIndex < highCount) return "HIGH PRIORITY";
  if (rankIndex < watchCount) return "WATCH";
  return "IGNORE";
}

export function assignOpportunityTiers<T extends { opportunity_score: number; opportunity_action?: OpportunityAction }>(
  items: T[]
): T[] {
  const sorted = [...items].sort((a, b) => b.opportunity_score - a.opportunity_score);
  const total = sorted.length;
  const rankById = new Map<string, number>();
  sorted.forEach((item, idx) => {
    rankById.set((item as { id?: string }).id ?? String(idx), idx);
  });

  return items.map((item, fallbackIdx) => {
    const id = (item as { id?: string }).id ?? String(fallbackIdx);
    const rank = rankById.get(id) ?? fallbackIdx;
    return {
      ...item,
      opportunity_action: assignTierByRank(rank, total),
    };
  });
}

export function computeConfidenceScore(input: {
  sourceCount: number;
  estimateSpreadPct: number;
  dataAgeHours: number;
  hasOfficialUrl: boolean;
}): number {
  let score = 15 + input.sourceCount * 12;
  if (input.hasOfficialUrl) score += 8;
  score -= Math.min(35, input.estimateSpreadPct * 0.8);
  score -= Math.min(25, input.dataAgeHours * 0.15);
  return Math.max(8, Math.min(92, Math.round(score)));
}
