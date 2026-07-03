import type { Release, BuyLocation, SaleType } from "@/types";
import { classifyRelease } from "@/lib/categories/taxonomy";

const KNALLER_SLUGS = new Set([
  "aj1-travis-medium-olive",
  "pokemon-charizard-collection",
  "pokemon-151-upc",
  "switch-2-launch",
  "off-white-nike-terra",
  "taylor-antwerp-presale",
  "super-bowl-lxi-2027",
  "ucl-final-2026-munich",
]);

function saleTypeFor(release: Release): SaleType {
  const main = classifyRelease(release).main;
  if (release.drop_event_type === "presale") return "voorverkoop";
  if (release.drop_event_type === "preorder") return "preorder";
  if (main === "tickets") return release.drop_event_type === "general_sale" ? "algemene_verkoop" : "voorverkoop";
  if (main === "schoenen") return "raffle";
  return "drop";
}

function buildBuyLocations(release: Release): BuyLocation[] {
  const main = classifyRelease(release).main;
  const sub = classifyRelease(release).sub;
  const isTicket = release.release_type === "ticket";
  const isTcg = main === "kaarten";
  const isSneaker = main === "schoenen";
  const isFootballBoot = sub === "football-boots";

  if (isTicket) {
    return [
      {
        name: "Ticketmaster",
        type: "online",
        url: release.official_url ?? undefined,
        country: release.countries?.code ?? "BE",
        note: "Alleen officiële kanalen",
      },
    ];
  }

  if (isTcg) {
    return [
      { name: "Pokémon Center", type: "online", url: "https://www.pokemoncenter.com", country: "NL", note: "15:00 CET" },
      { name: "bol.com", type: "online", url: "https://www.bol.com", country: "BE" },
      { name: "Game Mania", type: "fysiek", url: "https://www.gamemania.be", country: "BE" },
    ];
  }

  if (isFootballBoot) {
    return [
      { name: "SNKRS", type: "online", url: "https://www.nike.com/launch", country: "NL", note: "09:00 CET" },
      { name: "Adidas Confirmed", type: "online", url: "https://www.adidas.com", country: "BE" },
      { name: "Pro-Direct", type: "online", url: "https://www.prodirectsoccer.com", country: "GB" },
    ];
  }

  if (isSneaker) {
    return [
      { name: "SNKRS", type: "online", url: "https://www.nike.com/launch", country: "NL", note: "09:00 CET — LEO" },
      { name: release.brands?.name ?? "Retail", type: "online", url: release.official_url ?? undefined, country: "BE" },
    ];
  }

  return [
    { name: "Officiële winkel", type: "online", url: release.official_url ?? undefined, country: "BE" },
  ];
}

function buildDescription(release: Release): string {
  const cat = release.release_categories?.name ?? "release";
  if (release.release_type === "ticket") {
    return `${release.title} is een ${cat.toLowerCase()} met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.`;
  }
  if (release.tcg_name) {
    return `${release.title} is een sealed ${release.tcg_name}-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.`;
  }
  if (release.release_categories?.slug === "limited-sneakers") {
    return `${release.title} is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.`;
  }
  return `${release.title} is een ${cat.toLowerCase()} met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.`;
}

function buildHypeReason(release: Release, index: number): string | null {
  if (!KNALLER_SLUGS.has(release.slug) && release.priority_level !== "EXTREME") return null;
  if (release.tcg_name) return "Zeldzame sealed productie — historisch 2×–4× binnen 30 dagen na release.";
  if (release.release_categories?.slug === "limited-sneakers") return "Grail-silhouet met beperkte stock — vergelijkbare drops deden +120–180% netto ROI.";
  if (release.release_type === "ticket") return "Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.";
  if (index % 17 === 0) return "Launch-bundle met wereldwijde hype en schaarse day-one voorraad.";
  return "Extreme opportunity score — top-tier vraag en beperkte supply.";
}

export function enrichMockRelease(release: Release, index: number): Release {
  const buy_locations = buildBuyLocations(release);
  const hype_reason = buildHypeReason(release, index);

  return {
    ...release,
    description: buildDescription(release),
    buy_locations,
    hype_reason,
    sale_type: saleTypeFor(release),
    source_name: "Demo data",
    source_checked_at: new Date().toISOString(),
  };
}
