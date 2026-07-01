import type { EnrichedRelease } from "@/lib/data/enrich-releases";

export type AlertRuleType =
  | "opportunity_score_gte"
  | "roi_gte"
  | "profit_gte"
  | "priority_equals"
  | "sellout_gte"
  | "momentum_gte"
  | "price_direction_up"
  | "new_release"
  | "presale_within_hours";

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  rule_type: AlertRuleType;
  threshold?: number;
  value?: string;
  channels: ("in_app" | "discord" | "telegram" | "email")[];
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  rule_name: string;
  release_id: string;
  release_title: string;
  message: string;
  triggered_at: string;
  metadata: Record<string, unknown>;
}

export class AlertRulesService {
  evaluate(rule: AlertRule, release: EnrichedRelease): boolean {
    if (!rule.enabled) return false;

    if (rule.last_triggered_at) {
      const cooldownMs = rule.cooldown_minutes * 60000;
      if (Date.now() - new Date(rule.last_triggered_at).getTime() < cooldownMs) return false;
    }

    switch (rule.rule_type) {
      case "opportunity_score_gte":
        return release.opportunity_score >= (rule.threshold ?? 75);
      case "roi_gte":
        return (release.expected_roi_mid ?? 0) >= (rule.threshold ?? 50);
      case "profit_gte":
        return (release.expected_profit_mid ?? 0) >= (rule.threshold ?? 100);
      case "priority_equals":
        return release.priority_level === (rule.value ?? "EXTREME");
      case "sellout_gte":
        return release.sellout_probability >= (rule.threshold ?? 90);
      case "momentum_gte":
        return release.momentum_score >= (rule.threshold ?? 70);
      case "price_direction_up":
        return release.price_direction === "UP";
      case "new_release": {
        if (!release.created_at) return false;
        return Date.now() - new Date(release.created_at).getTime() < 48 * 3600000;
      }
      case "presale_within_hours": {
        if (!release.presale_starts_at) return false;
        const hours = (new Date(release.presale_starts_at).getTime() - Date.now()) / 3600000;
        return hours > 0 && hours <= (rule.threshold ?? 24);
      }
      default:
        return false;
    }
  }

  buildMessage(rule: AlertRule, release: EnrichedRelease): string {
    return `Alert "${rule.name}": ${release.title} — Opp ${release.opportunity_score}, ROI ${release.expected_roi_mid ?? 0}% (Estimated). Official link only.`;
  }
}

export const alertRulesService = new AlertRulesService();
