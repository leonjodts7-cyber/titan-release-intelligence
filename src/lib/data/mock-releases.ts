import type { Release, ReleaseType, PriorityLevel, ReleaseStatus } from "@/types";

function addDays(base: Date, d: number): string {
  return new Date(base.getTime() + d * 86400000).toISOString();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Template {
  title: string;
  category: string;
  categorySlug: string;
  type: ReleaseType;
  priceMin: number;
  priceMax: number;
  currency: string;
  daysUntil: number;
  hype: number;
  demand: number;
  sellout: number;
  priority: PriorityLevel;
  artist?: string;
  brand?: string;
  league?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  capacity?: number;
  stock?: number;
  officialUrl?: string;
  tcgName?: string;
  setName?: string;
  productType?: string;
  rarity?: string;
  sealed?: boolean;
  msrp?: number;
  marketPrice?: number;
  status?: ReleaseStatus;
}

function buildRelease(id: number, t: Template, now: Date): Release {
  const slug = slugify(t.title);
  return {
    id: String(id),
    title: t.title,
    slug,
    category_id: `c-${t.categorySlug}`,
    brand_id: t.brand ? `b-${slugify(t.brand)}` : null,
    artist_id: t.artist ? `a-${slugify(t.artist)}` : null,
    league_id: t.league ? `l-${slugify(t.league)}` : null,
    team_home_id: null,
    team_away_id: null,
    venue_id: t.city ? `v-${slugify(t.city)}` : null,
    country_id: t.countryCode ? `co-${t.countryCode}` : null,
    city_id: t.city ? `ci-${slugify(t.city)}` : null,
    release_type: t.type,
    status: t.status ?? "announced",
    official_url: t.officialUrl ?? `https://official.example.com/${slug}`,
    source_url: `https://source.example.com/${slug}`,
    image_url: null,
    description: `${t.title} — tracked by TITAN intelligence`,
    announced_at: addDays(now, -7),
    presale_starts_at: addDays(now, Math.max(1, t.daysUntil - 5)),
    general_sale_starts_at: addDays(now, Math.max(2, t.daysUntil - 2)),
    release_starts_at: addDays(now, t.daysUntil),
    release_ends_at: null,
    timezone: "UTC",
    price_min: t.priceMin,
    price_max: t.priceMax,
    currency: t.currency,
    stock_estimate: t.stock ?? null,
    capacity_estimate: t.capacity ?? null,
    hype_score: t.hype,
    demand_score: t.demand,
    urgency_score: Math.min(100, t.sellout * 0.7 + 20),
    sellout_probability: t.sellout,
    resale_interest_score: Math.min(100, t.hype * 0.9),
    confidence_score: Math.min(95, 70 + t.hype * 0.2),
    priority_level: t.priority,
    last_checked_at: now.toISOString(),
    last_changed_at: addDays(now, -2),
    source_adapter_id: `s-${(id % 12) + 1}`,
    external_id: null,
    created_at: addDays(now, -14),
    updated_at: addDays(now, -1),
    release_categories: { name: t.category, slug: t.categorySlug },
    brands: t.brand ? { name: t.brand } : null,
    artists: t.artist ? { name: t.artist } : null,
    sports_leagues: t.league ? { name: t.league } : null,
    countries: t.country ? { name: t.country, code: t.countryCode ?? "XX" } : null,
    cities: t.city ? { name: t.city } : null,
    venues: t.capacity ? { name: `${t.city ?? "Venue"} Arena`, capacity: t.capacity } : null,
    tcg_name: t.tcgName ?? null,
    set_name: t.setName ?? null,
    product_type_tcg: t.productType ?? null,
    card_rarity: t.rarity ?? null,
    sealed_product: t.sealed ?? null,
    msrp: t.msrp ?? t.priceMin,
    market_price: t.marketPrice ?? null,
  };
}

const CONCERT_TEMPLATES: Omit<Template, "title">[] = [
  { artist: "Taylor Swift", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 85, priceMax: 350, currency: "GBP", daysUntil: 45, hype: 98, demand: 99, sellout: 99, priority: "EXTREME", city: "London", country: "United Kingdom", countryCode: "GB", capacity: 90000 },
  { artist: "Coldplay", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 75, priceMax: 250, currency: "EUR", daysUntil: 30, hype: 92, demand: 95, sellout: 98, priority: "EXTREME", city: "Paris", country: "France", countryCode: "FR", capacity: 80000 },
  { artist: "Drake", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 90, priceMax: 300, currency: "USD", daysUntil: 60, hype: 88, demand: 90, sellout: 92, priority: "HIGH", city: "Toronto", country: "Canada", countryCode: "CA", capacity: 20000 },
  { artist: "Travis Scott", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 80, priceMax: 250, currency: "USD", daysUntil: 40, hype: 94, demand: 96, sellout: 97, priority: "EXTREME", city: "Houston", country: "United States", countryCode: "US", capacity: 72000 },
  { artist: "The Weeknd", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 70, priceMax: 220, currency: "EUR", daysUntil: 55, hype: 85, demand: 87, sellout: 88, priority: "HIGH", city: "Amsterdam", country: "Netherlands", countryCode: "NL", capacity: 17000 },
  { artist: "Beyoncé", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 100, priceMax: 400, currency: "USD", daysUntil: 70, hype: 96, demand: 97, sellout: 98, priority: "EXTREME", city: "Los Angeles", country: "United States", countryCode: "US", capacity: 70000 },
  { artist: "Bad Bunny", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 60, priceMax: 200, currency: "EUR", daysUntil: 35, hype: 90, demand: 92, sellout: 94, priority: "EXTREME", city: "Madrid", country: "Spain", countryCode: "ES", capacity: 60000 },
  { artist: "Ed Sheeran", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 55, priceMax: 150, currency: "GBP", daysUntil: 80, hype: 82, demand: 84, sellout: 86, priority: "HIGH", city: "Manchester", country: "United Kingdom", countryCode: "GB", capacity: 55000 },
  { artist: "Billie Eilish", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 65, priceMax: 180, currency: "EUR", daysUntil: 50, hype: 86, demand: 88, sellout: 90, priority: "HIGH", city: "Berlin", country: "Germany", countryCode: "DE", capacity: 17000 },
  { artist: "Dua Lipa", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 60, priceMax: 175, currency: "GBP", daysUntil: 42, hype: 84, demand: 86, sellout: 88, priority: "HIGH", city: "London", country: "United Kingdom", countryCode: "GB", capacity: 20000 },
];

const CONCERT_CITIES = ["London", "Paris", "Berlin", "Amsterdam", "Madrid", "Rome", "Dublin", "Brussels", "Vienna", "Stockholm"];
const CONCERT_ARTISTS = ["Coldplay", "Taylor Swift", "Drake", "Travis Scott", "The Weeknd", "Beyoncé", "Bad Bunny", "Ed Sheeran", "Billie Eilish", "Dua Lipa", "Arctic Monkeys", "Post Malone", "SZA", "Olivia Rodrigo", "Harry Styles"];

const SPORTS_EVENTS = [
  { title: "Super Bowl LXI", league: "NFL", category: "Super Bowl", categorySlug: "super-bowl", priceMin: 500, priceMax: 5000, currency: "USD", daysUntil: 200, hype: 99, demand: 99, sellout: 99, priority: "EXTREME" as PriorityLevel, city: "New Orleans", country: "United States", countryCode: "US", capacity: 73000 },
  { title: "UEFA Champions League Final 2027", league: "UEFA Champions League", category: "Champions League", categorySlug: "champions-league", priceMin: 150, priceMax: 800, currency: "EUR", daysUntil: 150, hype: 96, demand: 97, sellout: 95, priority: "EXTREME" as PriorityLevel, city: "Munich", country: "Germany", countryCode: "DE", capacity: 75000 },
  { title: "FIFA World Cup Final 2026", league: "FIFA", category: "World Cup", categorySlug: "world-cup", priceMin: 300, priceMax: 2000, currency: "USD", daysUntil: 180, hype: 99, demand: 99, sellout: 99, priority: "EXTREME" as PriorityLevel, city: "New York", country: "United States", countryCode: "US", capacity: 82500 },
  { title: "El Clásico — Real Madrid vs Barcelona", league: "La Liga", category: "Sport Tickets", categorySlug: "sport-tickets", priceMin: 80, priceMax: 500, currency: "EUR", daysUntil: 25, hype: 92, demand: 94, sellout: 96, priority: "EXTREME" as PriorityLevel, city: "Madrid", country: "Spain", countryCode: "ES", capacity: 81000 },
  { title: "Premier League — Arsenal vs Liverpool", league: "Premier League", category: "Sport Tickets", categorySlug: "sport-tickets", priceMin: 60, priceMax: 250, currency: "GBP", daysUntil: 14, hype: 88, demand: 90, sellout: 94, priority: "HIGH" as PriorityLevel, city: "London", country: "United Kingdom", countryCode: "GB", capacity: 60704 },
  { title: "NBA Finals Game 7", league: "NBA", category: "Sport Tickets", categorySlug: "sport-tickets", priceMin: 200, priceMax: 1500, currency: "USD", daysUntil: 90, hype: 94, demand: 95, sellout: 97, priority: "EXTREME" as PriorityLevel, city: "Boston", country: "United States", countryCode: "US", capacity: 19580 },
  { title: "Formula 1 Monaco Grand Prix", league: "Formula 1", category: "Sport Tickets", categorySlug: "sport-tickets", priceMin: 150, priceMax: 800, currency: "EUR", daysUntil: 75, hype: 90, demand: 92, sellout: 93, priority: "HIGH" as PriorityLevel, city: "Monaco", country: "Monaco", countryCode: "MC", capacity: 37000 },
  { title: "UFC 320 — Championship", league: "UFC", category: "Sport Tickets", categorySlug: "sport-tickets", priceMin: 150, priceMax: 1200, currency: "USD", daysUntil: 45, hype: 91, demand: 93, sellout: 96, priority: "EXTREME" as PriorityLevel, city: "Las Vegas", country: "United States", countryCode: "US", capacity: 20000 },
  { title: "Wimbledon Finals Day", league: "Wimbledon", category: "Sport Tickets", categorySlug: "sport-tickets", priceMin: 100, priceMax: 600, currency: "GBP", daysUntil: 120, hype: 86, demand: 88, sellout: 92, priority: "HIGH" as PriorityLevel, city: "London", country: "United Kingdom", countryCode: "GB", capacity: 15000 },
  { title: "Tomorrowland 2027 Ticket Sale", league: "Festivals", category: "Festivals", categorySlug: "festivals", priceMin: 120, priceMax: 400, currency: "EUR", daysUntil: 100, hype: 94, demand: 96, sellout: 97, priority: "EXTREME" as PriorityLevel, city: "Boom", country: "Belgium", countryCode: "BE", capacity: 400000 },
];

const SNEAKER_DROPS = [
  { title: "Air Jordan 1 Travis Scott", brand: "Jordan", priceMin: 150, priceMax: 150, stock: 8000, hype: 97, sellout: 99, priority: "EXTREME" as PriorityLevel },
  { title: "Nike Dunk Low Panda Restock", brand: "Nike", priceMin: 110, priceMax: 110, stock: 50000, hype: 75, sellout: 80, priority: "MEDIUM" as PriorityLevel },
  { title: "Nike Mercurial Superfly Elite", brand: "Nike", priceMin: 220, priceMax: 220, stock: 3000, hype: 88, sellout: 94, priority: "HIGH" as PriorityLevel },
  { title: "Nike Phantom GX Elite Drop", brand: "Nike", priceMin: 250, priceMax: 250, stock: 2500, hype: 82, sellout: 88, priority: "HIGH" as PriorityLevel },
  { title: "Adidas F50 Elite Limited", brand: "Adidas", priceMin: 280, priceMax: 280, stock: 2000, hype: 80, sellout: 86, priority: "HIGH" as PriorityLevel },
  { title: "Adidas Predator Elite Drop", brand: "Adidas", priceMin: 260, priceMax: 260, stock: 3500, hype: 78, sellout: 85, priority: "HIGH" as PriorityLevel },
  { title: "New Balance 550 x Aime Leon Dore", brand: "New Balance", priceMin: 140, priceMax: 140, stock: 5000, hype: 85, sellout: 92, priority: "HIGH" as PriorityLevel },
  { title: "Nike Air Max 1 OG Red", brand: "Nike", priceMin: 160, priceMax: 160, stock: 10000, hype: 80, sellout: 88, priority: "HIGH" as PriorityLevel },
  { title: "Yeezy Slide Restock", brand: "Adidas", priceMin: 70, priceMax: 70, stock: 100000, hype: 70, sellout: 75, priority: "MEDIUM" as PriorityLevel },
  { title: "Nike SB Dunk Low Pro", brand: "Nike", priceMin: 115, priceMax: 115, stock: 6000, hype: 83, sellout: 90, priority: "HIGH" as PriorityLevel },
];

const TCG_PRODUCTS = [
  { title: "Pokémon Mega Evolution Charizard Collection", tcgName: "Pokémon", setName: "Mega Evolution", productType: "collection", rarity: "Ultra Rare", sealed: true, msrp: 49, marketPrice: 120, hype: 92, sellout: 95, priority: "EXTREME" as PriorityLevel },
  { title: "Pokémon Elite Trainer Box — Prismatic Evolutions", tcgName: "Pokémon", setName: "Prismatic Evolutions", productType: "ETB", rarity: null, sealed: true, msrp: 55, marketPrice: 95, hype: 88, sellout: 93, priority: "EXTREME" as PriorityLevel },
  { title: "One Piece Booster Box OP-12", tcgName: "One Piece", setName: "OP-12", productType: "booster_box", rarity: null, sealed: true, msrp: 120, marketPrice: 180, hype: 90, sellout: 92, priority: "EXTREME" as PriorityLevel },
  { title: "Lorcana Collector Set — Chapter 8", tcgName: "Lorcana", setName: "Chapter 8", productType: "collector_set", rarity: "Legendary", sealed: true, msrp: 60, marketPrice: 110, hype: 85, sellout: 90, priority: "HIGH" as PriorityLevel },
  { title: "Magic Secret Lair Drop — Doctor Who", tcgName: "Magic", setName: "Secret Lair", productType: "secret_lair", rarity: "Mythic", sealed: true, msrp: 40, marketPrice: 75, hype: 82, sellout: 88, priority: "HIGH" as PriorityLevel },
  { title: "Yu-Gi-Oh! Quarter Century Bonanza Box", tcgName: "Yu-Gi-Oh", setName: "Quarter Century", productType: "booster_box", rarity: null, sealed: true, msrp: 80, marketPrice: 130, hype: 80, sellout: 86, priority: "HIGH" as PriorityLevel },
  { title: "Sports Card Hobby Box — 2026 Topps Chrome", tcgName: "Sports Cards", setName: "Topps Chrome 2026", productType: "hobby_box", rarity: null, sealed: true, msrp: 250, marketPrice: 320, hype: 78, sellout: 82, priority: "HIGH" as PriorityLevel },
  { title: "Pokémon 151 Ultra Premium Collection", tcgName: "Pokémon", setName: "151", productType: "UPC", rarity: null, sealed: true, msrp: 120, marketPrice: 250, hype: 94, sellout: 97, priority: "EXTREME" as PriorityLevel },
];

const FASHION_GAMING = [
  { title: "Supreme Box Logo Hoodie FW26", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion" as ReleaseType, brand: "Supreme", priceMin: 168, priceMax: 168, stock: 2000, hype: 88, sellout: 95, priority: "EXTREME" as PriorityLevel },
  { title: "Palace Tri-Ferg Drop", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion" as ReleaseType, brand: "Palace", priceMin: 58, priceMax: 120, stock: 3000, hype: 82, sellout: 90, priority: "HIGH" as PriorityLevel },
  { title: "PlayStation 5 Pro Bundle Drop", category: "Gaming", categorySlug: "gaming", type: "gaming" as ReleaseType, brand: "Sony", priceMin: 599, priceMax: 699, stock: 15000, hype: 85, sellout: 92, priority: "HIGH" as PriorityLevel },
  { title: "Nintendo Switch 2 Launch Bundle", category: "Gaming", categorySlug: "gaming", type: "gaming" as ReleaseType, brand: "Nintendo", priceMin: 449, priceMax: 499, stock: 50000, hype: 96, sellout: 98, priority: "EXTREME" as PriorityLevel },
  { title: "Kith x BMW Collection Drop", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion" as ReleaseType, brand: "Kith", priceMin: 85, priceMax: 350, stock: 1500, hype: 80, sellout: 88, priority: "HIGH" as PriorityLevel },
];

export function generateMockReleases(): Release[] {
  const now = new Date();
  const releases: Release[] = [];
  let id = 1;

  // 30 concerts
  for (let i = 0; i < 30; i++) {
    const artist = CONCERT_ARTISTS[i % CONCERT_ARTISTS.length];
    const city = CONCERT_CITIES[i % CONCERT_CITIES.length];
    const base = CONCERT_TEMPLATES[i % CONCERT_TEMPLATES.length];
    releases.push(buildRelease(id++, {
      title: `${artist} — ${city} ${2026 + (i % 2)}`,
      ...base,
      artist,
      city,
      daysUntil: 10 + (i * 3) % 90,
      hype: Math.min(99, base.hype - (i % 5) * 2),
      demand: Math.min(99, base.demand - (i % 4)),
      sellout: Math.min(99, base.sellout - (i % 3)),
      officialUrl: `https://www.ticketmaster.com/${slugify(artist)}`,
    }, now));
  }

  // 25 sports
  for (let i = 0; i < 25; i++) {
    const ev = SPORTS_EVENTS[i % SPORTS_EVENTS.length];
    const suffix = i >= SPORTS_EVENTS.length ? ` (${Math.floor(i / SPORTS_EVENTS.length) + 1})` : "";
    releases.push(buildRelease(id++, {
      ...ev,
      title: ev.title + suffix,
      type: "ticket",
      category: ev.category,
      categorySlug: ev.categorySlug,
      daysUntil: 7 + (i * 5) % 120,
      hype: Math.min(99, ev.hype - (i % 4)),
      demand: Math.min(99, ev.demand - (i % 3)),
      sellout: Math.min(99, ev.sellout - (i % 2)),
    }, now));
  }

  // 20 sneakers
  for (let i = 0; i < 20; i++) {
    const s = SNEAKER_DROPS[i % SNEAKER_DROPS.length];
    releases.push(buildRelease(id++, {
      title: s.title + (i >= SNEAKER_DROPS.length ? ` v${i}` : ""),
      category: "Limited Sneakers",
      categorySlug: "limited-sneakers",
      type: "product",
      priceMin: s.priceMin,
      priceMax: s.priceMax,
      currency: "EUR",
      daysUntil: 1 + (i * 2) % 30,
      hype: s.hype,
      demand: s.hype - 3,
      sellout: s.sellout,
      priority: s.priority,
      brand: s.brand,
      stock: s.stock,
      officialUrl: `https://www.nike.com/launch/t/${slugify(s.title)}`,
    }, now));
  }

  // 15 TCG
  for (let i = 0; i < 15; i++) {
    const t = TCG_PRODUCTS[i % TCG_PRODUCTS.length];
    releases.push(buildRelease(id++, {
      title: t.title,
      category: "TCG & Collectibles",
      categorySlug: "tcg-collectibles",
      type: "collectible",
      priceMin: t.msrp,
      priceMax: t.msrp,
      currency: "USD",
      daysUntil: 3 + (i * 4) % 45,
      hype: t.hype,
      demand: t.hype - 2,
      sellout: t.sellout,
      priority: t.priority,
      tcgName: t.tcgName,
      setName: t.setName,
      productType: t.productType,
      rarity: t.rarity ?? undefined,
      sealed: t.sealed,
      msrp: t.msrp,
      marketPrice: t.marketPrice,
      stock: 5000 + (i * 500),
      officialUrl: `https://www.pokemoncenter.com/${slugify(t.title)}`,
    }, now));
  }

  // 10 fashion/gaming
  for (let i = 0; i < 10; i++) {
    const f = FASHION_GAMING[i % FASHION_GAMING.length];
    releases.push(buildRelease(id++, {
      ...f,
      title: f.title,
      daysUntil: 2 + (i * 3) % 21,
      hype: f.hype,
      demand: f.hype - 5,
      sellout: f.sellout,
      currency: "USD",
      officialUrl: `https://official.example.com/${slugify(f.title)}`,
    }, now));
  }

  return releases;
}
