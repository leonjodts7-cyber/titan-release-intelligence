import type { Release } from "@/types";
import { resaleIntelligenceService } from "./resale-intelligence.service";

const CONCERT_ARTISTS = [
  "coldplay", "taylor swift", "drake", "travis scott", "the weeknd", "beyoncé",
  "bad bunny", "ed sheeran", "billie eilish", "dua lipa",
];
const SPORTS_EVENTS = [
  "super bowl", "champions league final", "world cup", "euro final",
  "premier league", "el clasico", "nba finals", "formula 1", "ufc", "wimbledon", "olympics",
];
const PRODUCT_DROPS = [
  "nike snkrs", "jordan", "travis scott", "nike mercurial", "nike phantom",
  "adidas f50", "adidas predator", "supreme", "palace", "limited",
];
const FESTIVALS = ["tomorrowland", "coachella", "glastonbury", "ultra", "edc"];

export interface DiscoveryScore {
  release_id: string;
  discovery_score: number;
  global_demand: number;
  limited_availability: number;
  historical_sellout: number;
  resale_potential: number;
  source_reliability: number;
  urgency: number;
  tier: "S" | "A" | "B" | "C";
  reasons: string[];
}

export class DiscoveryService {
  score(release: Release): DiscoveryScore {
    const title = release.title.toLowerCase();
    const category = (release.release_categories?.name ?? "").toLowerCase();
    const combined = `${title} ${category}`;
    const reasons: string[] = [];

    let globalDemand = release.demand_score ?? 50;
    if (CONCERT_ARTISTS.some((a) => combined.includes(a))) {
      globalDemand = Math.max(globalDemand, 92);
      reasons.push("Global artist demand");
    }
    if (SPORTS_EVENTS.some((e) => combined.includes(e))) {
      globalDemand = Math.max(globalDemand, 90);
      reasons.push("Major sporting event");
    }
    if (PRODUCT_DROPS.some((p) => combined.includes(p))) {
      globalDemand = Math.max(globalDemand, 85);
      reasons.push("High-demand product drop");
    }
    if (FESTIVALS.some((f) => combined.includes(f))) {
      globalDemand = Math.max(globalDemand, 88);
      reasons.push("Major festival");
    }

    let limitedAvailability = 50;
    if (release.capacity_estimate && release.capacity_estimate < 100000) {
      limitedAvailability = Math.min(100, 50 + (100000 - release.capacity_estimate) / 2000);
    }
    if (release.stock_estimate && release.stock_estimate < 10000) {
      limitedAvailability = Math.max(limitedAvailability, Math.min(100, 60 + (10000 - release.stock_estimate) / 200));
    }
    if (limitedAvailability >= 75) reasons.push("Limited availability");

    const historicalSellout = release.sellout_probability ?? 50;
    if (historicalSellout >= 90) reasons.push("High sellout probability");

    const resale = resaleIntelligenceService.analyze(release);
    const resalePotential = Math.min(100, (resale.expected_roi_mid ?? 0) * 0.5 + (resale.resale_confidence_score ?? 0) * 0.5);

    const sourceReliability = release.confidence_score ?? 70;
    const urgency = release.urgency_score ?? 50;

    const discoveryScore = Math.round(
      globalDemand * 0.25 +
      limitedAvailability * 0.15 +
      historicalSellout * 0.2 +
      resalePotential * 0.2 +
      sourceReliability * 0.1 +
      urgency * 0.1
    );

    const tier: DiscoveryScore["tier"] =
      discoveryScore >= 90 ? "S" :
      discoveryScore >= 75 ? "A" :
      discoveryScore >= 55 ? "B" : "C";

    return {
      release_id: release.id,
      discovery_score: discoveryScore,
      global_demand: Math.round(globalDemand),
      limited_availability: Math.round(limitedAvailability),
      historical_sellout: Math.round(historicalSellout),
      resale_potential: Math.round(resalePotential),
      source_reliability: Math.round(sourceReliability),
      urgency: Math.round(urgency),
      tier,
      reasons: reasons.length ? reasons : ["Standard release profile"],
    };
  }

  prioritize(releases: Release[]): Release[] {
    return [...releases].sort(
      (a, b) => this.score(b).discovery_score - this.score(a).discovery_score
    );
  }
}

export const discoveryService = new DiscoveryService();
