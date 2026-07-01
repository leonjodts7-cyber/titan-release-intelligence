import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import type { AlertRule, AlertEvent } from "@/services/alert-rules.service";
import { alertRulesService } from "@/services/alert-rules.service";

const MOCK_RULES: AlertRule[] = [
  { id: "ar1", name: "TOP Opportunity", enabled: true, rule_type: "opportunity_score_gte", threshold: 85, channels: ["in_app", "discord"], cooldown_minutes: 60, last_triggered_at: null, created_at: new Date().toISOString() },
  { id: "ar2", name: "High ROI Alert", enabled: true, rule_type: "roi_gte", threshold: 80, channels: ["in_app"], cooldown_minutes: 120, last_triggered_at: null, created_at: new Date().toISOString() },
  { id: "ar3", name: "EXTREME Priority", enabled: true, rule_type: "priority_equals", value: "EXTREME", channels: ["in_app", "telegram"], cooldown_minutes: 30, last_triggered_at: null, created_at: new Date().toISOString() },
  { id: "ar4", name: "Presale in 24h", enabled: true, rule_type: "presale_within_hours", threshold: 24, channels: ["in_app"], cooldown_minutes: 360, last_triggered_at: null, created_at: new Date().toISOString() },
  { id: "ar5", name: "Momentum Spike", enabled: true, rule_type: "momentum_gte", threshold: 75, channels: ["in_app"], cooldown_minutes: 90, last_triggered_at: null, created_at: new Date().toISOString() },
];

let rulesCache = [...MOCK_RULES];
const eventsCache: AlertEvent[] = [];

export function getAlertRules(): AlertRule[] {
  return [...rulesCache];
}

export function getAlertEvents(limit = 50): AlertEvent[] {
  return eventsCache.slice(0, limit);
}

export function evaluateAllAlerts(releases: EnrichedRelease[]): AlertEvent[] {
  const triggered: AlertEvent[] = [];

  for (const rule of rulesCache) {
    for (const release of releases) {
      if (!alertRulesService.evaluate(rule, release)) continue;

      const event: AlertEvent = {
        id: `evt_${Date.now()}_${rule.id}_${release.id}`,
        rule_id: rule.id,
        rule_name: rule.name,
        release_id: release.id,
        release_title: release.title,
        message: alertRulesService.buildMessage(rule, release),
        triggered_at: new Date().toISOString(),
        metadata: {
          opportunity_score: release.opportunity_score,
          roi: release.expected_roi_mid,
          rule_type: rule.rule_type,
        },
      };
      triggered.push(event);
      eventsCache.unshift(event);
      if (eventsCache.length > 200) eventsCache.pop();

      const idx = rulesCache.findIndex((r) => r.id === rule.id);
      if (idx >= 0) rulesCache[idx] = { ...rulesCache[idx], last_triggered_at: new Date().toISOString() };
      break;
    }
  }

  return triggered;
}

export function toggleAlertRule(id: string): AlertRule | null {
  const idx = rulesCache.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  rulesCache[idx] = { ...rulesCache[idx], enabled: !rulesCache[idx].enabled };
  return rulesCache[idx];
}
