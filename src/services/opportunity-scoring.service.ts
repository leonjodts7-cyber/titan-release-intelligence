import type { Release } from "@/types";
import type { ResaleIntelligence } from "./resale-intelligence.service";

export type OpportunityAction = "IGNORE" | "WATCH" | "PREPARE" | "PRIORITY" | "MUST WATCH";

export interface OpportunityScore {
  opportunity_score: number;
  scarcity_score: number;
  resale_potential: number;
  risk_score: number;
  action_urgency: number;
  opportunity_action: OpportunityAction;
}

export class OpportunityScoringService {
  score(release: Partial<Release>, resale: ResaleIntelligence): OpportunityScore {
    const hype = release.hype_score ?? 50;
    const demand = release.demand_score ?? 50;
    const sellout = release.sellout_probability ?? 50;
    const urgency = release.urgency_score ?? 50;
    const confidence = resale.resale_confidence_score ?? release.confidence_score ?? 50;
    const roi = resale.expected_roi_mid ?? 0;
    const profit = resale.expected_profit_mid ?? 0;
    const liquidity = resale.market_liquidity_score ?? 50;

    const scarcity = this.calcScarcity(release);
    const resalePotential = Math.min(100, roi * 0.4 + (profit > 0 ? Math.min(40, profit / 10) : 0) + sellout * 0.2);
    const risk = this.calcRisk(release, resale);
    const actionUrgency = Math.min(100, urgency * 0.5 + sellout * 0.3 + (release.presale_starts_at ? 20 : 0));

    const opportunityScore = Math.round(
      hype * 0.12 +
      demand * 0.12 +
      scarcity * 0.1 +
      sellout * 0.12 +
      resalePotential * 0.18 +
      roi * 0.08 +
      liquidity * 0.08 +
      confidence * 0.1 +
      actionUrgency * 0.1 -
      risk * 0.1
    );

    const clamped = Math.max(0, Math.min(100, opportunityScore));

    return {
      opportunity_score: clamped,
      scarcity_score: Math.round(scarcity),
      resale_potential: Math.round(resalePotential),
      risk_score: Math.round(risk),
      action_urgency: Math.round(actionUrgency),
      opportunity_action: this.toAction(clamped, roi, sellout),
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
    let risk = 30;
    if (resale.resale_risk_level === "EXTREME") risk += 25;
    else if (resale.resale_risk_level === "HIGH") risk += 15;
    if (!release.official_url) risk += 15;
    if ((resale.resale_confidence_score ?? 0) < 60) risk += 10;
    if (release.status === "rumored") risk += 10;
    return Math.min(100, risk);
  }

  private toAction(score: number, roi: number, sellout: number): OpportunityAction {
    if (score >= 88 && (roi >= 80 || sellout >= 95)) return "MUST WATCH";
    if (score >= 75) return "PRIORITY";
    if (score >= 60) return "PREPARE";
    if (score >= 40) return "WATCH";
    return "IGNORE";
  }
}

export const opportunityScoringService = new OpportunityScoringService();
