import type { Release } from "@/types";
import type { ResaleIntelligence } from "./resale-intelligence.service";
import type { IntelligenceProfile } from "./intelligence-enrichment.service";
import { computeOpportunityScoreV2 } from "@/lib/scoring-v2";

export type OpportunityAction =
  | "IGNORE"
  | "WATCH"
  | "PREPARE"
  | "HIGH PRIORITY"
  | "MUST WATCH"
  | "TOP OPPORTUNITY";

export interface OpportunityEngineResult {
  opportunity_score: number;
  scarcity_score: number;
  resale_potential: number;
  risk_score: number;
  action_urgency: number;
  momentum_score: number;
  news_score: number;
  social_score: number;
  historical_performance_score: number;
  opportunity_action: OpportunityAction;
}

export class OpportunityEngineService {
  score(
    release: Partial<Release>,
    resale: ResaleIntelligence,
    intel: IntelligenceProfile
  ): OpportunityEngineResult {
    const demand = Math.min(100, release.demand_score ?? 50);
    const scarcity = this.calcScarcity(release);
    const liquidity = Math.min(100, resale.market_liquidity_score ?? 50);
    const momentum = Math.min(100, intel.momentum_score ?? 50);
    const netMarginScore = resale.net_margin_score ?? 0;

    const opportunityScore = computeOpportunityScoreV2({
      demand,
      netMarginScore,
      scarcity,
      liquidity,
      momentum,
    });

    const risk = this.calcRisk(release, resale);
    const actionUrgency = Math.min(
      100,
      (release.urgency_score ?? 50) * 0.35 +
        (release.sellout_probability ?? 50) * 0.35 +
        momentum * 0.2 +
        (release.presale_starts_at ? 10 : 0)
    );
    const histPerf = Math.min(100, intel.historical_roi_pct * 0.4 + (intel.historical_sellout_pct ?? 50) * 0.4);

    return {
      opportunity_score: opportunityScore,
      scarcity_score: Math.round(scarcity),
      resale_potential: Math.round(netMarginScore * 0.85 + liquidity * 0.15),
      risk_score: Math.round(risk),
      action_urgency: Math.round(actionUrgency),
      momentum_score: momentum,
      news_score: intel.news_activity_score,
      social_score: intel.social_activity_score,
      historical_performance_score: Math.round(histPerf),
      opportunity_action: "WATCH",
    };
  }

  private calcScarcity(release: Partial<Release>): number {
    const sellout = release.sellout_probability ?? 50;
    let score = 30 + sellout * 0.45;
    if (release.capacity_estimate) {
      score = Math.max(score, Math.min(100, 40 + (80000 - Math.min(release.capacity_estimate, 80000)) / 1200));
    }
    if (release.stock_estimate) {
      score = Math.max(score, Math.min(100, 35 + (8000 - Math.min(release.stock_estimate, 8000)) / 120));
    }
    return Math.min(100, score);
  }

  private calcRisk(release: Partial<Release>, resale: ResaleIntelligence): number {
    let risk = 20;
    if (resale.resale_risk_level === "EXTREME") risk += 25;
    else if (resale.resale_risk_level === "HIGH") risk += 15;
    else if (resale.resale_risk_level === "MEDIUM") risk += 8;
    if (!release.official_url) risk += 12;
    if ((resale.resale_confidence_score ?? 0) < 45) risk += 15;
    if (release.status === "rumored") risk += 12;
    if ((resale.net_roi_mid ?? 0) < 0) risk += 10;
    return Math.min(100, risk);
  }
}

export const opportunityEngineService = new OpportunityEngineService();
export type OpportunityScore = OpportunityEngineResult;
export const opportunityScoringService = opportunityEngineService;
