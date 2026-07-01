import type { EnrichedRelease } from "@/lib/data/enrich-releases";

export interface ReleaseIntelligenceReport {
  why_ranked: string;
  factors_changed: string;
  official_sources_confirmed: string;
  historical_context: string;
  biggest_risks: string;
  developments_to_watch: string;
  market_outlook: string;
  confidence_explanation: string;
  recommended_action: string;
  full_brief: string;
}

export class ReleaseIntelligenceService {
  analyze(release: EnrichedRelease): ReleaseIntelligenceReport {
    const action = release.opportunity_action ?? "WATCH";
    const title = release.title;

    const whyRanked = `${title} ranks highly because opportunity score is ${release.opportunity_score}/100 with ${action} classification. ` +
      `Demand ${Math.round(release.demand_score)}%, scarcity ${release.scarcity_score}%, momentum ${release.momentum_score}%, ` +
      `and estimated ROI ${release.expected_roi_mid ?? 0}% (Estimated).`;

    const factorsChanged = release.last_changed_at
      ? `Last intelligence update ${new Date(release.last_changed_at).toLocaleString()}. ` +
        `News activity ${release.news_activity_score}%, social ${release.social_activity_score}%, price direction ${release.price_direction}.`
      : "No material changes detected in the last scan cycle.";

    const sourcesConfirmed = release.official_sources?.length
      ? `Confirmed via: ${release.official_sources.join(", ")}. Market confidence ${release.market_confidence}%.`
      : "Awaiting official source confirmation — treat as lower confidence.";

    const historical = release.release_type === "ticket"
      ? `Historical sellout ${release.historical_sellout_pct ?? release.sellout_probability}% of comparable events. ` +
        `Average sellout window ${release.historical_sellout_minutes ?? "—"} minutes. ` +
        `Attendance fill rate ${release.historical_attendance_pct ?? "—"}%.`
      : release.tcg_name
        ? `TCG trend ${release.tcg_trend}. Historical growth ${release.historical_growth_pct ?? "—"}%. Collector score ${release.collector_score ?? "—"}.`
        : `Historical ROI on comparable drops: ${release.historical_roi_pct}%. Volatility ${release.volatility_score}/100.`;

    const risks = [
      release.risk_score >= 60 ? "Elevated market/regulatory risk" : null,
      release.status === "rumored" ? "Not officially confirmed" : null,
      release.volatility_score >= 70 ? "High price volatility" : null,
      release.expected_queue_difficulty === "EXTREME" ? "Extreme queue competition expected" : null,
      !release.official_url ? "No verified official link" : null,
    ].filter(Boolean).join("; ") || "Standard category risk profile.";

    const watch = [
      `Google Trends ${release.google_trends_score}/100`,
      release.presale_starts_at ? "Presale window" : null,
      release.extra_show_probability ? `Extra show probability ${release.extra_show_probability}%` : null,
      release.international_interest_score ? `International interest ${release.international_interest_score}%` : null,
      "Official platform announcements only",
    ].filter(Boolean).join(" · ");

    const outlook = release.price_direction === "UP"
      ? `Market trending UP (+${release.historical_price_change_pct}% historical). Liquidity ${Math.round(release.market_liquidity_score)}%.`
      : release.price_direction === "DOWN"
        ? "Market softening — monitor for entry points."
        : "Market stable — watch for catalyst events.";

    const confidenceExplanation = release.ai_confidence >= 80
      ? `High confidence (${release.ai_confidence}%) driven by official sources, demand signals, and historical comparables.`
      : `Moderate confidence (${release.ai_confidence}%) — estimates are rule-based where live market data is limited (Estimated).`;

    const recommendedAction = action === "TOP OPPORTUNITY" || action === "MUST WATCH"
      ? "Immediate prep: accounts, payment, official link saved, alerts on. Manual purchase only via official channels."
      : action === "HIGH PRIORITY"
        ? "Add to watchlist. Verify presale eligibility. Set calendar reminders."
        : action === "PREPARE"
          ? "Monitor weekly. Track price movement feed."
          : "Passive tracking sufficient.";

    const fullBrief = `${title} is ${action}. ${whyRanked} ${confidenceExplanation} Recommended: ${recommendedAction}`;

    return {
      why_ranked: whyRanked,
      factors_changed: factorsChanged,
      official_sources_confirmed: sourcesConfirmed,
      historical_context: historical,
      biggest_risks: risks,
      developments_to_watch: watch,
      market_outlook: outlook,
      confidence_explanation: confidenceExplanation,
      recommended_action: recommendedAction,
      full_brief: fullBrief,
    };
  }
}

export const releaseIntelligenceService = new ReleaseIntelligenceService();
