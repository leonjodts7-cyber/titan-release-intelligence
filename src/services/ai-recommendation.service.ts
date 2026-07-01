import type { Release } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";

export interface AIRecommendation {
  why_important: string;
  why_risky: string;
  what_changed: string;
  what_to_monitor: string;
  estimated_opportunity: string;
  recommended_action: string;
  full_summary: string;
  confidence: number;
}

export class AIRecommendationService {
  generate(release: EnrichedRelease): AIRecommendation {
    const title = release.title;
    const action = release.opportunity_action ?? "WATCH";
    const confidence = release.resale_confidence_score ?? release.confidence_score ?? 70;
    const roi = release.expected_roi_mid ?? 0;
    const profit = release.expected_profit_mid ?? 0;
    const currency = release.retail_currency ?? release.currency;

    const whyImportant = this.buildWhyImportant(release);
    const whyRisky = this.buildWhyRisky(release);
    const whatChanged = release.last_changed_at
      ? `Last update detected ${new Date(release.last_changed_at).toLocaleDateString()}. Monitor for presale/sale date changes.`
      : "No recent changes detected. Status stable.";
    const whatToMonitor = this.buildMonitor(release);
    const estimatedOpportunity = profit > 0
      ? `Estimated profit ${currency} ${release.expected_profit_low}–${release.expected_profit_high} (+${roi}% ROI). Liquidity ${Math.round(release.market_liquidity_score)}%.`
      : "Limited profit upside based on current signals.";

    const recommendedAction = action === "TOP OPPORTUNITY" || action === "MUST WATCH"
      ? "Set alerts immediately. Prepare official platform accounts. Save official link. Do NOT use third-party checkout tools."
      : action === "HIGH PRIORITY" || String(action) === "PRIORITY"
        ? "Add to watchlist. Verify official link. Check presale eligibility and timezone."
        : action === "PREPARE"
          ? "Monitor weekly. Save official link when confirmed."
          : "Low urgency — track passively.";

    const fullSummary = `${title} is ${action} because ${whyImportant.replace(/\.$/, "")}, and secondary/resale pricing is likely to ${profit > 0 ? "exceed retail" : "stay near retail"}. Confidence: ${Math.round(confidence)}% (Estimated).`;

    return {
      why_important: whyImportant,
      why_risky: whyRisky,
      what_changed: whatChanged,
      what_to_monitor: whatToMonitor,
      estimated_opportunity: estimatedOpportunity,
      recommended_action: recommendedAction,
      full_summary: fullSummary,
      confidence: Math.round(confidence),
    };
  }

  private buildWhyImportant(release: EnrichedRelease): string {
    const parts: string[] = [];
    if ((release.demand_score ?? 0) >= 85) parts.push("demand is global or category-leading");
    if (release.capacity_estimate && release.capacity_estimate < 50000) {
      parts.push(`venue capacity (${release.capacity_estimate.toLocaleString()}) is limited versus expected demand`);
    }
    if ((release.sellout_probability ?? 0) >= 90) parts.push("historical sellout probability is very high");
    if (release.tcg_name) parts.push(`${release.tcg_name} collector demand is elevated`);
    if (release.brands?.name) parts.push(`${release.brands.name} brand/collab multiplier applies`);
    if (release.artists?.name) parts.push(`${release.artists.name} drives global ticket demand`);
    return parts.length ? parts.join(", ") + "." : "Moderate demand signals for this category.";
  }

  private buildWhyRisky(release: EnrichedRelease): string {
    const parts: string[] = [];
    if (release.status === "rumored") parts.push("release not officially confirmed");
    if ((release.risk_score ?? 0) >= 60) parts.push("elevated market/regulatory risk");
    if (!release.official_url) parts.push("no verified official link yet");
    if ((release.resale_confidence_score ?? 0) < 65) parts.push("limited market data — estimates are rule-based");
    return parts.length ? parts.join("; ") + "." : "Standard market risk for category.";
  }

  private buildMonitor(release: Release): string {
    if (release.release_type === "ticket") {
      return "Presale dates, general sale window, official resale policy, and venue capacity updates.";
    }
    if (release.tcg_name) {
      return "MSRP availability, sealed product supply, market price on TCGplayer/CardMarket, grading premiums.";
    }
    return "Drop time, stock levels, official SNKRS/Confirmed notifications, and resale platform pricing.";
  }
}

export const aiRecommendationService = new AIRecommendationService();
