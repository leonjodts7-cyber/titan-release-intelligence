import type { Release } from "@/types";
import type { ResaleIntelligence } from "./resale-intelligence.service";
import type { IntelligenceProfile } from "./intelligence-enrichment.service";

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
    const hype = release.hype_score ?? 50;
    const demand = release.demand_score ?? 50;
    const sellout = release.sellout_probability ?? 50;
    const urgency = release.urgency_score ?? 50;
    const confidence = intel.ai_confidence;
    const roi = resale.expected_roi_mid ?? 0;
    const profit = resale.expected_profit_mid ?? 0;
    const liquidity = resale.market_liquidity_score ?? 50;

    const scarcity = this.calcScarcity(release);
    const resalePotential = Math.min(100, roi * 0.35 + (profit > 0 ? Math.min(35, profit / 12) : 0) + sellout * 0.25);
    const risk = this.calcRisk(release, resale);
    const actionUrgency = Math.min(100, urgency * 0.4 + sellout * 0.35 + intel.momentum_score * 0.15 + (release.presale_starts_at ? 10 : 0));
    const histPerf = Math.min(100, intel.historical_roi_pct * 0.4 + (intel.historical_sellout_pct ?? sellout) * 0.6);

    const opportunityScore = Math.round(
      demand * 0.1 +
      scarcity * 0.1 +
      sellout * 0.1 +
      resalePotential * 0.15 +
      roi * 0.07 +
      liquidity * 0.07 +
      confidence * 0.08 +
      actionUrgency * 0.08 +
      intel.momentum_score * 0.1 +
      intel.news_activity_score * 0.05 +
      intel.social_activity_score * 0.05 +
      histPerf * 0.05 -
      risk * 0.1
    );

    const clamped = Math.max(0, Math.min(100, opportunityScore));

    return {
      opportunity_score: clamped,
      scarcity_score: Math.round(scarcity),
      resale_potential: Math.round(resalePotential),
      risk_score: Math.round(risk),
      action_urgency: Math.round(actionUrgency),
      momentum_score: intel.momentum_score,
      news_score: intel.news_activity_score,
      social_score: intel.social_activity_score,
      historical_performance_score: Math.round(histPerf),
      opportunity_action: this.toAction(clamped, roi, sellout, intel.momentum_score),
    };
  }

  private calcScarcity(release: Partial<Release>): number {
    let score = 40;
    if (release.capacity_estimate) {
      score = Math.min(100, 50 + (100000 - Math.min(release.capacity_estimate, 100000)) / 2000);
    }
    if (release.stock_estimate) {
      score = Math.max(score, Math.min(100, 40 + (10000 - Math.min(release.stock_estimate, 10000)) / 150));
    }
    if ((release.sellout_probability ?? 0) >= 90) score = Math.max(score, 85);
    return score;
  }

  private calcRisk(release: Partial<Release>, resale: ResaleIntelligence): number {
    let risk = 25;
    if (resale.resale_risk_level === "EXTREME") risk += 20;
    else if (resale.resale_risk_level === "HIGH") risk += 12;
    if (!release.official_url) risk += 15;
    if ((resale.resale_confidence_score ?? 0) < 60) risk += 12;
    if (release.status === "rumored") risk += 10;
    return Math.min(100, risk);
  }

  private toAction(score: number, roi: number, sellout: number, momentum: number): OpportunityAction {
    if (score >= 92 && roi >= 100 && momentum >= 70) return "TOP OPPORTUNITY";
    if (score >= 88 && (roi >= 80 || sellout >= 95)) return "MUST WATCH";
    if (score >= 75) return "HIGH PRIORITY";
    if (score >= 60) return "PREPARE";
    if (score >= 40) return "WATCH";
    return "IGNORE";
  }
}

export const opportunityEngineService = new OpportunityEngineService();

// Back-compat alias
export type OpportunityScore = OpportunityEngineResult;
export const opportunityScoringService = opportunityEngineService;
