import type { Release, WatchlistRule } from "@/types";
import { isWithinDays } from "@/lib/utils";

export class WatchlistService {
  matchRelease(release: Release, rules: WatchlistRule[]): boolean {
    if (!rules.length) return false;
    return rules.every((rule) => this.matchRule(release, rule));
  }

  matchRule(release: Release, rule: WatchlistRule): boolean {
    const fieldValue = this.getFieldValue(release, rule.field);
    if (fieldValue === null && rule.operator !== "within_days") return false;

    const ruleValue = rule.value.toLowerCase();

    switch (rule.operator) {
      case "equals":
        return String(fieldValue).toLowerCase() === ruleValue;
      case "contains":
        return String(fieldValue).toLowerCase().includes(ruleValue);
      case "gte":
        return Number(fieldValue) >= Number(rule.value);
      case "lte":
        return Number(fieldValue) <= Number(rule.value);
      case "within_days":
        return isWithinDays(release.release_starts_at, Number(rule.value))
          || isWithinDays(release.presale_starts_at, Number(rule.value));
      default:
        return false;
    }
  }

  getFieldValue(release: Release, field: string): string | number | null {
    switch (field) {
      case "artist":
        return release.artists?.name ?? null;
      case "brand":
        return release.brands?.name ?? null;
      case "category":
        return release.release_categories?.name ?? release.release_categories?.slug ?? null;
      case "league":
        return release.sports_leagues?.name ?? null;
      case "country":
        return release.countries?.name ?? release.countries?.code ?? null;
      case "source":
        return release.source_adapter_id ?? null;
      case "priority_level":
      case "priority":
        return release.priority_level;
      case "title":
        return release.title;
      case "hype_score":
        return release.hype_score;
      case "sellout_probability":
        return release.sellout_probability;
      default:
        return null;
    }
  }

  testRules(release: Release, rules: WatchlistRule[]): { matched: boolean; details: string[] } {
    const details: string[] = [];
    let allMatch = true;

    for (const rule of rules) {
      const matched = this.matchRule(release, rule);
      details.push(`${rule.field} ${rule.operator} "${rule.value}": ${matched ? "✓" : "✗"}`);
      if (!matched) allMatch = false;
    }

    return { matched: allMatch, details };
  }
}

export const watchlistService = new WatchlistService();
