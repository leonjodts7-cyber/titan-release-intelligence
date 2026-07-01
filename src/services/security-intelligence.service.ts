import type { EnrichedRelease } from "@/lib/data/enrich-releases";

/** Defensive security intelligence — read-only signals for manual preparation. No bypass tooling. */
export interface SecurityIntelligence {
  bot_protection_level: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  queue_expected: boolean;
  queue_fairness_score: number;
  captcha_likelihood: number;
  rate_limit_risk: number;
  account_warmup_recommended: boolean;
  official_only: boolean;
  risk_summary: string;
  preparation_notes: string[];
}

export class SecurityIntelligenceService {
  analyze(release: EnrichedRelease): SecurityIntelligence {
    const sellout = release.sellout_probability ?? 50;
    const hype = release.hype_score ?? 50;
    const queueExpected = sellout >= 80 || release.expected_queue_difficulty !== "LOW";

    let botProtection: SecurityIntelligence["bot_protection_level"] = "LOW";
    if (sellout >= 95 || release.brands?.name === "Nike") botProtection = "EXTREME";
    else if (sellout >= 85 || release.release_type === "ticket") botProtection = "HIGH";
    else if (sellout >= 70) botProtection = "MEDIUM";

    const captchaLikelihood = Math.min(95, sellout * 0.6 + (release.official_url?.includes("ticketmaster") ? 25 : 10));
    const rateLimitRisk = Math.min(90, sellout * 0.5 + hype * 0.3);

    const queueFairness = queueExpected
      ? Math.max(40, 85 - (release.volatility_score ?? 30) * 0.2)
      : 90;

    const notes: string[] = [
      "Use only official retailer links — TITAN does not automate checkout.",
      "Prepare payment and account details manually before drop time.",
    ];
    if (queueExpected) notes.push("High-demand release — expect virtual waiting room or queue.");
    if (botProtection === "EXTREME") notes.push("Strong bot protection likely — manual browser recommended, no automation.");
    if (release.presale_starts_at) notes.push(`Presale window: ${new Date(release.presale_starts_at).toLocaleString()}.`);

    return {
      bot_protection_level: botProtection,
      queue_expected: queueExpected,
      queue_fairness_score: Math.round(queueFairness),
      captcha_likelihood: Math.round(captchaLikelihood),
      rate_limit_risk: Math.round(rateLimitRisk),
      account_warmup_recommended: botProtection === "HIGH" || botProtection === "EXTREME",
      official_only: true,
      risk_summary: queueExpected
        ? `Expect queue and ${botProtection.toLowerCase()} bot protection. Fairness score ${Math.round(queueFairness)}/100 (estimated).`
        : `Moderate protection expected. Prepare manually via official channels.`,
      preparation_notes: notes,
    };
  }
}

export const securityIntelligenceService = new SecurityIntelligenceService();
