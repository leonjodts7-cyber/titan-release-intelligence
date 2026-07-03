import type { Release } from "@/types";

export type MainCategory = "schoenen" | "tickets" | "kaarten" | "overig";

export interface SubCategoryDef {
  slug: string;
  label: string;
  icon: string;
}

export interface MainCategoryDef {
  slug: MainCategory;
  label: string;
  color: string;
  border: string;
  chip: string;
  accent: string;
  subcategories: SubCategoryDef[];
}

export const MAIN_CATEGORIES: Record<MainCategory, MainCategoryDef> = {
  schoenen: {
    slug: "schoenen",
    label: "Schoenen",
    color: "text-violet-300",
    border: "border-l-violet-500",
    chip: "bg-violet-500/20 text-violet-200 border-violet-500/40",
    accent: "border-violet-500/60",
    subcategories: [
      { slug: "limited-sneakers", label: "Limited Sneakers", icon: "footprints" },
      { slug: "football-boots", label: "Voetbalschoenen", icon: "soccer" },
      { slug: "running", label: "Running", icon: "run" },
      { slug: "basketball", label: "Basketball", icon: "basketball" },
      { slug: "collabs", label: "Collabs", icon: "sparkles" },
    ],
  },
  tickets: {
    slug: "tickets",
    label: "Tickets",
    color: "text-rose-300",
    border: "border-l-rose-500",
    chip: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    accent: "border-rose-500/60",
    subcategories: [
      { slug: "concerts", label: "Concerten", icon: "music" },
      { slug: "festivals", label: "Festivals", icon: "festival" },
      { slug: "football", label: "Voetbal", icon: "trophy" },
      { slug: "american-sports", label: "Amerikaanse sport", icon: "football" },
      { slug: "tennis-other", label: "Tennis & overig", icon: "tennis" },
    ],
  },
  kaarten: {
    slug: "kaarten",
    label: "Kaarten",
    color: "text-amber-300",
    border: "border-l-amber-500",
    chip: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    accent: "border-amber-500/60",
    subcategories: [
      { slug: "pokemon", label: "Pokémon", icon: "layers" },
      { slug: "one-piece", label: "One Piece", icon: "ship" },
      { slug: "lorcana", label: "Lorcana", icon: "wand" },
      { slug: "magic", label: "Magic", icon: "sparkle" },
      { slug: "yugioh", label: "Yu-Gi-Oh", icon: "cards" },
      { slug: "sports-cards", label: "Sports Cards", icon: "medal" },
    ],
  },
  overig: {
    slug: "overig",
    label: "Overig",
    color: "text-slate-300",
    border: "border-l-slate-500",
    chip: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    accent: "border-slate-500/60",
    subcategories: [
      { slug: "fashion-drops", label: "Fashion Drops", icon: "shirt" },
      { slug: "gaming", label: "Gaming & consoles", icon: "gamepad" },
    ],
  },
};

const HUB_ROUTES: Record<MainCategory, string> = {
  schoenen: "/dashboard/schoenen",
  tickets: "/dashboard/tickets",
  kaarten: "/dashboard/kaarten",
  overig: "/dashboard/kalender",
};

export function hubRoute(main: MainCategory): string {
  return HUB_ROUTES[main];
}

export function subLabel(main: MainCategory, subSlug: string): string {
  return MAIN_CATEGORIES[main].subcategories.find((s) => s.slug === subSlug)?.label ?? subSlug;
}

/** Classify a release into main + sub category. */
export function classifyRelease(release: Release): { main: MainCategory; sub: string } {
  if (release.main_category && release.sub_category) {
    return {
      main: release.main_category as MainCategory,
      sub: release.sub_category,
    };
  }

  const slug = release.slug.toLowerCase();
  const catSlug = release.release_categories?.slug ?? "";
  const title = release.title.toLowerCase();
  const tcg = release.tcg_name?.toLowerCase() ?? "";
  const brand = release.brands?.name?.toLowerCase() ?? "";

  // Voetbalschoenen
  if (
    /mercurial|phantom|predator|f50|football-boot|voetbal|superfly|gx elite/i.test(title) ||
    slug.includes("mercurial") ||
    slug.includes("phantom") ||
    slug.includes("f50") ||
    slug.includes("predator") ||
    catSlug === "nike-football-boots" ||
    catSlug === "adidas-drops" && /f50|predator/i.test(title)
  ) {
    return { main: "schoenen", sub: "football-boots" };
  }

  // Sneakers
  if (
    catSlug === "limited-sneakers" ||
    catSlug === "nike-drops" ||
    /dunk|jordan|yeezy|samba|air max|sb dunk|travis|off-white/i.test(title)
  ) {
    if (/travis|off-white|collab|x /i.test(title)) return { main: "schoenen", sub: "collabs" };
    return { main: "schoenen", sub: "limited-sneakers" };
  }
  if (/kayano|vomero|salomon|xt-6|running/i.test(title)) return { main: "schoenen", sub: "running" };

  // Kaarten
  if (tcg === "pokémon" || tcg === "pokemon" || /pokemon|pokémon/i.test(title)) {
    return { main: "kaarten", sub: "pokemon" };
  }
  if (tcg === "one piece" || /one piece/i.test(title)) return { main: "kaarten", sub: "one-piece" };
  if (tcg === "lorcana" || /lorcana/i.test(title)) return { main: "kaarten", sub: "lorcana" };
  if (tcg === "magic" || /magic|secret lair|modern horizons/i.test(title)) return { main: "kaarten", sub: "magic" };
  if (tcg === "yu-gi-oh" || /yu-gi-oh|yugioh/i.test(title)) return { main: "kaarten", sub: "yugioh" };
  if (tcg === "sports cards" || /topps|chrome|hobby box/i.test(title)) return { main: "kaarten", sub: "sports-cards" };
  if (catSlug === "tcg-collectibles" || release.tcg_name) return { main: "kaarten", sub: "pokemon" };

  // Tickets
  if (release.release_type === "ticket" || catSlug.includes("ticket") || catSlug === "festivals") {
    if (catSlug === "festivals" || /tomorrowland|glastonbury|festival/i.test(title)) {
      return { main: "tickets", sub: "festivals" };
    }
    if (
      catSlug === "champions-league" ||
      catSlug === "super-bowl" ||
      catSlug === "football-matches" ||
      catSlug === "world-cup" ||
      catSlug === "premier-league" ||
      /ucl|champions league|clásico|world cup|wk |derby|grand prix|f1 |six nations/i.test(title)
    ) {
      if (/super bowl|nba|nfl|nhl|indy/i.test(title)) return { main: "tickets", sub: "american-sports" };
      if (/wimbledon|roland-garros|tennis|f1 |grand prix|tdf/i.test(title)) {
        return { main: "tickets", sub: "tennis-other" };
      }
      if (/super bowl|nba finals/i.test(title)) return { main: "tickets", sub: "american-sports" };
      return { main: "tickets", sub: "football" };
    }
    if (/super bowl|nba|nfl|nhl/i.test(title)) return { main: "tickets", sub: "american-sports" };
    if (/wimbledon|roland-garros|f1 |monaco gp/i.test(title)) return { main: "tickets", sub: "tennis-other" };
    if (release.artists?.name || /swift|coldplay|concert|tour|beyoncé|drake/i.test(title)) {
      return { main: "tickets", sub: "concerts" };
    }
    return { main: "tickets", sub: "concerts" };
  }

  // Overig
  if (catSlug === "fashion-drops" || /supreme|palace|stüssy|fear of god|kith/i.test(title)) {
    return { main: "overig", sub: "fashion-drops" };
  }
  if (catSlug === "gaming" || catSlug === "gaming-drops" || /switch|ps5|xbox|steam deck/i.test(title)) {
    return { main: "overig", sub: "gaming" };
  }

  return { main: "overig", sub: "fashion-drops" };
}

export function withCategoryFields<T extends Release>(release: T): T & { main_category: MainCategory; sub_category: string } {
  const { main, sub } = classifyRelease(release);
  return { ...release, main_category: main, sub_category: sub };
}

export function filterByMain<T extends Release>(items: T[], main: MainCategory): T[] {
  return items.filter((r) => classifyRelease(r).main === main);
}

export function filterBySub<T extends Release>(items: T[], main: MainCategory, sub?: string): T[] {
  if (!sub) return filterByMain(items, main);
  return items.filter((r) => {
    const c = classifyRelease(r);
    return c.main === main && c.sub === sub;
  });
}

export function countBySub<T extends Release>(items: T[], main: MainCategory): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sub of MAIN_CATEGORIES[main].subcategories) counts[sub.slug] = 0;
  counts.all = items.filter((r) => classifyRelease(r).main === main).length;
  for (const r of items) {
    const c = classifyRelease(r);
    if (c.main === main) counts[c.sub] = (counts[c.sub] ?? 0) + 1;
  }
  return counts;
}
