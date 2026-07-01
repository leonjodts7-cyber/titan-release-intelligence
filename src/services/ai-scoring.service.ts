import type { Release, AIScoreResult, PriorityLevel } from "@/types";
import { isWithinHours } from "@/lib/utils";
import OpenAI from "openai";

const EXTREME_KEYWORDS = [
  "super bowl", "champions league final", "taylor swift", "coldplay",
  "travis scott", "jordan", "tomorrowland", "world cup",
];
const HIGH_KEYWORDS = [
  "nike", "adidas", "mercurial", "phantom", "limited", "premier league",
  "eras tour", "stadium",
];

export class AIScoringService {
  async score(release: Partial<Release>): Promise<AIScoreResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        return await this.scoreWithOpenAI(release, apiKey);
      } catch {
        // Fall through to rule-based
      }
    }
    return this.scoreWithRules(release);
  }

  private async scoreWithOpenAI(release: Partial<Release>, apiKey: string): Promise<AIScoreResult> {
    const openai = new OpenAI({ apiKey });
    const prompt = `Analyze this release for demand and priority scoring.
Title: ${release.title}
Category: ${release.release_categories?.name ?? "unknown"}
Description: ${release.description ?? "none"}
Price: ${release.price_min}-${release.price_max} ${release.currency}
Capacity: ${release.capacity_estimate ?? "unknown"}
Date: ${release.release_starts_at ?? "TBA"}

Return JSON with: hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score (all 0-100), priority_level (LOW/MEDIUM/HIGH/EXTREME), short_summary, recommended_action, risk_notes`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content) as AIScoreResult;
    }
    return this.scoreWithRules(release);
  }

  scoreWithRules(release: Partial<Release>): AIScoreResult {
    const title = (release.title ?? "").toLowerCase();
    const category = (release.release_categories?.name ?? "").toLowerCase();
    const combined = `${title} ${category}`;

    let baseScore = 50;

    if (EXTREME_KEYWORDS.some((k) => combined.includes(k))) baseScore = 92;
    else if (HIGH_KEYWORDS.some((k) => combined.includes(k))) baseScore = 78;
    else if (release.release_type === "ticket") baseScore = 60;

    const urgencyBoost = isWithinHours(release.release_starts_at ?? null, 24) ? 20 :
      isWithinHours(release.release_starts_at ?? null, 168) ? 10 : 0;

    const hype = Math.min(100, baseScore + Math.random() * 5);
    const demand = Math.min(100, baseScore + 3);
    const urgency = Math.min(100, 40 + urgencyBoost + (release.presale_starts_at ? 15 : 0));
    const sellout = Math.min(100, baseScore + 5);
    const resale = Math.min(100, baseScore);
    const confidence = release.official_url ? 85 : 65;

    const priority = this.calculatePriority(hype, demand, sellout);

    return {
      hype_score: Math.round(hype),
      demand_score: Math.round(demand),
      urgency_score: Math.round(urgency),
      sellout_probability: Math.round(sellout),
      resale_interest_score: Math.round(resale),
      confidence_score: Math.round(confidence),
      priority_level: priority,
      short_summary: this.generateSummary(release, priority),
      recommended_action: this.generateAction(release, priority),
      risk_notes: this.generateRiskNotes(release),
    };
  }

  private calculatePriority(hype: number, demand: number, sellout: number): PriorityLevel {
    const avg = (hype + demand + sellout) / 3;
    if (avg >= 90) return "EXTREME";
    if (avg >= 75) return "HIGH";
    if (avg >= 55) return "MEDIUM";
    return "LOW";
  }

  private generateSummary(release: Partial<Release>, priority: PriorityLevel): string {
    return `${release.title} classified as ${priority} priority based on category, timing, and demand signals.`;
  }

  private generateAction(release: Partial<Release>, priority: PriorityLevel): string {
    if (priority === "EXTREME") {
      return "Set alerts immediately. Prepare accounts on official platform. Monitor for presale announcements.";
    }
    if (priority === "HIGH") {
      return "Add to watchlist. Verify official link. Check presale eligibility requirements.";
    }
    return "Monitor for updates. Add to calendar if interested.";
  }

  private generateRiskNotes(release: Partial<Release>): string {
    const notes: string[] = [];
    if (!release.official_url) notes.push("Official link not yet confirmed");
    if (release.status === "rumored") notes.push("Release not officially announced");
    if (notes.length === 0) notes.push("Use only official sources for purchases");
    return notes.join(". ");
  }
}

export const aiScoringService = new AIScoringService();
