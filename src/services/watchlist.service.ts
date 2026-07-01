import type { Release, WatchlistRule } from "@/types";
import { isWithinDays } from "@/lib/utils";

export class WatchlistService {
  matchRelease(release: Release, rules: WatchlistRule[]): boolean {
    if (!rules.length) return false;
    return rules.every((rule) => this.matchRule(release, rule));
  }

  matchRule(release: Release, rule: WatchlistRule): boolean {
    const fieldValue = this.getFieldValue(release, rule.field);
    if (fieldValue === null) return false;

    const ruleValue = rule.value.toLowerCase();
    const compareValue = String(fieldValue).toLowerCase();

    switch (rule.operator) {
      case "equals":
        return compareValue === ruleValue;
      case "contains":
        return compareValue.includes(ruleValue);
      case "gte":
        return Number(fieldValue) >= Number(rule.value);
      case "lte":
        return Number(fieldValue) <= Number(rule.value);
      case "within_days":
        return isWithinDays(release.release_starts_at, Number(rule.value));
      default:
        return false;
    }
  }

  private getFieldValue(release: Release, field: string): string | number | null {
    switch (field) {
      case "artist":
        return release.artists?.name ?? null;
      case "brand":
        return release.brands?.name ?? null;
      case "category":
        return release.release_categories?.name ?? null;
      case "league":
        return release.sports_leagues?.name ?? null;
      case "country":
        return release.countries?.name ?? null;
      case "priority_level":
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
      details.push(
        `${rule.field} ${rule.operator} "${rule.value}": ${matched ? "✓" : "✗"}`
      );
      if (!matched) allMatch = false;
    }

    return { matched: allMatch, details };
  }
}

export const watchlistService = new WatchlistService();
