import type { Release, ReleaseType, PriorityLevel, ReleaseStatus } from "@/types";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function addDays(base: Date, d: number): string {
  return new Date(base.getTime() + d * 86400000).toISOString();
}

function fixedDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day, 19, 0, 0)).toISOString();
}

interface MockSpec {
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  type: ReleaseType;
  priceMin: number;
  priceMax: number;
  currency: string;
  releaseAt: string;
  presaleDaysBefore?: number;
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
  tcgName?: string;
  setName?: string;
  productType?: string;
  rarity?: string;
  sealed?: boolean;
  msrp?: number;
  marketPrice?: number;
  status?: ReleaseStatus;
  officialUrl?: string;
}

function buildRelease(id: number, spec: MockSpec, now: Date): Release {
  const releaseTs = new Date(spec.releaseAt).getTime();
  const daysUntil = Math.max(1, Math.ceil((releaseTs - now.getTime()) / 86400000));
  const presaleOffset = spec.presaleDaysBefore ?? 14;

  return {
    id: String(id),
    title: spec.title,
    slug: spec.slug,
    category_id: `c-${spec.categorySlug}`,
    brand_id: spec.brand ? `b-${slugify(spec.brand)}` : null,
    artist_id: spec.artist ? `a-${slugify(spec.artist)}` : null,
    league_id: spec.league ? `l-${slugify(spec.league)}` : null,
    team_home_id: null,
    team_away_id: null,
    venue_id: spec.city ? `v-${slugify(spec.city)}` : null,
    country_id: spec.countryCode ? `co-${spec.countryCode}` : null,
    city_id: spec.city ? `ci-${slugify(spec.city)}` : null,
    release_type: spec.type,
    status: spec.status ?? "announced",
    official_url: spec.officialUrl ?? `https://official.example.com/${spec.slug}`,
    source_url: `https://source.example.com/${spec.slug}`,
    image_url: null,
    description: `${spec.title} — tracked by TITAN intelligence`,
    announced_at: addDays(now, -21),
    presale_starts_at: addDays(new Date(spec.releaseAt), -presaleOffset),
    general_sale_starts_at: addDays(new Date(spec.releaseAt), -Math.max(2, presaleOffset - 3)),
    release_starts_at: spec.releaseAt,
    release_ends_at: null,
    timezone: "UTC",
    price_min: spec.priceMin,
    price_max: spec.priceMax,
    currency: spec.currency,
    stock_estimate: spec.stock ?? null,
    capacity_estimate: spec.capacity ?? null,
    hype_score: spec.hype,
    demand_score: spec.demand,
    urgency_score: Math.min(100, Math.round(spec.sellout * 0.65 + spec.demand * 0.15)),
    sellout_probability: spec.sellout,
    resale_interest_score: Math.min(100, Math.round(spec.hype * 0.75)),
    confidence_score: Math.min(88, 45 + Math.round(spec.hype * 0.25)),
    priority_level: spec.priority,
    last_checked_at: addDays(now, -Math.floor(id % 5)),
    last_changed_at: addDays(now, -Math.floor((id % 7) + 1)),
    source_adapter_id: `s-${(id % 12) + 1}`,
    external_id: null,
    created_at: addDays(now, -30),
    updated_at: addDays(now, -2),
    release_categories: { name: spec.category, slug: spec.categorySlug },
    brands: spec.brand ? { name: spec.brand } : null,
    artists: spec.artist ? { name: spec.artist } : null,
    sports_leagues: spec.league ? { name: spec.league } : null,
    countries: spec.country ? { name: spec.country, code: spec.countryCode ?? "XX" } : null,
    cities: spec.city ? { name: spec.city } : null,
    venues: spec.capacity ? { name: `${spec.city ?? "Venue"} Arena`, capacity: spec.capacity } : null,
    tcg_name: spec.tcgName ?? null,
    set_name: spec.setName ?? null,
    product_type_tcg: spec.productType ?? null,
    card_rarity: spec.rarity ?? null,
    sealed_product: spec.sealed ?? null,
    msrp: spec.msrp ?? spec.priceMin,
    market_price: spec.marketPrice ?? null,
  };
}

const MOCK_SPECS: MockSpec[] = [
  // Concerts (20)
  { title: "Taylor Swift — London (Jun 2026)", slug: "taylor-swift-london-jun-2026", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 95, priceMax: 380, currency: "GBP", releaseAt: fixedDate(2026, 6, 12), hype: 96, demand: 97, sellout: 98, priority: "EXTREME", artist: "Taylor Swift", city: "London", country: "United Kingdom", countryCode: "GB", capacity: 90000, officialUrl: "https://www.ticketmaster.co.uk/taylor-swift-london" },
  { title: "Coldplay — Paris (Jul 2026)", slug: "coldplay-paris-jul-2026", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 78, priceMax: 240, currency: "EUR", releaseAt: fixedDate(2026, 7, 8), hype: 88, demand: 90, sellout: 92, priority: "HIGH", artist: "Coldplay", city: "Paris", country: "France", countryCode: "FR", capacity: 80000 },
  { title: "Drake — Toronto (Aug 2026)", slug: "drake-toronto-aug-2026", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 110, priceMax: 320, currency: "CAD", releaseAt: fixedDate(2026, 8, 15), hype: 82, demand: 84, sellout: 86, priority: "HIGH", artist: "Drake", city: "Toronto", country: "Canada", countryCode: "CA", capacity: 20000 },
  { title: "Travis Scott — Houston (Sep 2026)", slug: "travis-scott-houston-sep-2026", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 85, priceMax: 260, currency: "USD", releaseAt: fixedDate(2026, 9, 5), hype: 91, demand: 93, sellout: 94, priority: "EXTREME", artist: "Travis Scott", city: "Houston", country: "United States", countryCode: "US", capacity: 72000 },
  { title: "Beyoncé — Los Angeles (Oct 2026)", slug: "beyonce-la-oct-2026", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 120, priceMax: 420, currency: "USD", releaseAt: fixedDate(2026, 10, 3), hype: 94, demand: 95, sellout: 96, priority: "EXTREME", artist: "Beyoncé", city: "Los Angeles", country: "United States", countryCode: "US", capacity: 70000 },
  { title: "Bad Bunny — Madrid (Nov 2026)", slug: "bad-bunny-madrid-nov-2026", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 65, priceMax: 210, currency: "EUR", releaseAt: fixedDate(2026, 11, 14), hype: 86, demand: 88, sellout: 89, priority: "HIGH", artist: "Bad Bunny", city: "Madrid", country: "Spain", countryCode: "ES", capacity: 60000 },
  { title: "Billie Eilish — Berlin (Dec 2026)", slug: "billie-eilish-berlin-dec-2026", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 68, priceMax: 175, currency: "EUR", releaseAt: fixedDate(2026, 12, 2), hype: 79, demand: 81, sellout: 83, priority: "MEDIUM", artist: "Billie Eilish", city: "Berlin", country: "Germany", countryCode: "DE", capacity: 17000 },
  { title: "Ed Sheeran — Manchester (Jan 2027)", slug: "ed-sheeran-manchester-jan-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 58, priceMax: 155, currency: "GBP", releaseAt: fixedDate(2027, 1, 18), hype: 74, demand: 76, sellout: 78, priority: "MEDIUM", artist: "Ed Sheeran", city: "Manchester", country: "United Kingdom", countryCode: "GB", capacity: 55000 },
  { title: "Dua Lipa — Amsterdam (Feb 2027)", slug: "dua-lipa-amsterdam-feb-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 62, priceMax: 168, currency: "EUR", releaseAt: fixedDate(2027, 2, 6), hype: 77, demand: 79, sellout: 81, priority: "MEDIUM", artist: "Dua Lipa", city: "Amsterdam", country: "Netherlands", countryCode: "NL", capacity: 17000 },
  { title: "The Weeknd — Brussels (Mar 2027)", slug: "the-weeknd-brussels-mar-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 72, priceMax: 225, currency: "EUR", releaseAt: fixedDate(2027, 3, 12), hype: 80, demand: 82, sellout: 84, priority: "HIGH", artist: "The Weeknd", city: "Brussels", country: "Belgium", countryCode: "BE", capacity: 15000 },
  { title: "Arctic Monkeys — Dublin (Apr 2027)", slug: "arctic-monkeys-dublin-apr-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 55, priceMax: 140, currency: "EUR", releaseAt: fixedDate(2027, 4, 9), hype: 71, demand: 73, sellout: 75, priority: "MEDIUM", artist: "Arctic Monkeys", city: "Dublin", country: "Ireland", countryCode: "IE", capacity: 13000 },
  { title: "Post Malone — Vienna (May 2027)", slug: "post-malone-vienna-may-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 60, priceMax: 165, currency: "EUR", releaseAt: fixedDate(2027, 5, 21), hype: 68, demand: 70, sellout: 72, priority: "LOW", artist: "Post Malone", city: "Vienna", country: "Austria", countryCode: "AT", capacity: 16000 },
  { title: "SZA — Stockholm (Jun 2027)", slug: "sza-stockholm-jun-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 58, priceMax: 150, currency: "EUR", releaseAt: fixedDate(2027, 6, 4), hype: 73, demand: 75, sellout: 77, priority: "MEDIUM", artist: "SZA", city: "Stockholm", country: "Sweden", countryCode: "SE", capacity: 14000 },
  { title: "Olivia Rodrigo — Rome (Jul 2027)", slug: "olivia-rodrigo-rome-jul-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 64, priceMax: 178, currency: "EUR", releaseAt: fixedDate(2027, 7, 16), hype: 76, demand: 78, sellout: 80, priority: "MEDIUM", artist: "Olivia Rodrigo", city: "Rome", country: "Italy", countryCode: "IT", capacity: 36000 },
  { title: "Harry Styles — Copenhagen (Aug 2027)", slug: "harry-styles-copenhagen-aug-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 70, priceMax: 195, currency: "EUR", releaseAt: fixedDate(2027, 8, 8), hype: 78, demand: 80, sellout: 82, priority: "HIGH", artist: "Harry Styles", city: "Copenhagen", country: "Denmark", countryCode: "DK", capacity: 38000 },
  { title: "Metallica — Munich (Sep 2027)", slug: "metallica-munich-sep-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 88, priceMax: 220, currency: "EUR", releaseAt: fixedDate(2027, 9, 19), hype: 72, demand: 74, sellout: 76, priority: "MEDIUM", artist: "Metallica", city: "Munich", country: "Germany", countryCode: "DE", capacity: 75000 },
  { title: "Adele — London (Oct 2027)", slug: "adele-london-oct-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 105, priceMax: 350, currency: "GBP", releaseAt: fixedDate(2027, 10, 10), hype: 90, demand: 92, sellout: 94, priority: "EXTREME", artist: "Adele", city: "London", country: "United Kingdom", countryCode: "GB", capacity: 65000 },
  { title: "Kendrick Lamar — Chicago (Nov 2027)", slug: "kendrick-chicago-nov-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 75, priceMax: 240, currency: "USD", releaseAt: fixedDate(2027, 11, 7), hype: 83, demand: 85, sellout: 87, priority: "HIGH", artist: "Kendrick Lamar", city: "Chicago", country: "United States", countryCode: "US", capacity: 23000 },
  { title: "Rosalía — Barcelona (Dec 2027)", slug: "rosalia-barcelona-dec-2027", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 52, priceMax: 145, currency: "EUR", releaseAt: fixedDate(2027, 12, 5), hype: 69, demand: 71, sellout: 73, priority: "LOW", artist: "Rosalía", city: "Barcelona", country: "Spain", countryCode: "ES", capacity: 55000 },
  { title: "Florence + The Machine — Lisbon (Jan 2028)", slug: "florence-lisbon-jan-2028", category: "Concert Tickets", categorySlug: "concert-tickets", type: "ticket", priceMin: 48, priceMax: 130, currency: "EUR", releaseAt: fixedDate(2028, 1, 22), hype: 62, demand: 64, sellout: 66, priority: "LOW", artist: "Florence + The Machine", city: "Lisbon", country: "Portugal", countryCode: "PT", capacity: 20000 },

  // Sports (20) — realistic calendar dates
  { title: "Super Bowl LXI — New Orleans", slug: "super-bowl-lxi-2027", category: "Super Bowl", categorySlug: "super-bowl", type: "ticket", priceMin: 550, priceMax: 4800, currency: "USD", releaseAt: fixedDate(2027, 2, 7), presaleDaysBefore: 45, hype: 98, demand: 99, sellout: 99, priority: "EXTREME", league: "NFL", city: "New Orleans", country: "United States", countryCode: "US", capacity: 73000 },
  { title: "UEFA Champions League Final 2026 — Munich", slug: "ucl-final-2026-munich", category: "Champions League", categorySlug: "champions-league", type: "ticket", priceMin: 160, priceMax: 850, currency: "EUR", releaseAt: fixedDate(2026, 5, 30), hype: 93, demand: 94, sellout: 95, priority: "EXTREME", league: "UEFA Champions League", city: "Munich", country: "Germany", countryCode: "DE", capacity: 75000 },
  { title: "FIFA World Cup Final 2026 — New York", slug: "world-cup-final-2026-nyc", category: "World Cup", categorySlug: "world-cup", type: "ticket", priceMin: 320, priceMax: 2100, currency: "USD", releaseAt: fixedDate(2026, 7, 19), hype: 97, demand: 98, sellout: 98, priority: "EXTREME", league: "FIFA", city: "New York", country: "United States", countryCode: "US", capacity: 82500 },
  { title: "El Clásico — Bernabéu Apr 2026", slug: "el-clasico-apr-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 85, priceMax: 520, currency: "EUR", releaseAt: fixedDate(2026, 4, 12), hype: 89, demand: 91, sellout: 93, priority: "EXTREME", league: "La Liga", city: "Madrid", country: "Spain", countryCode: "ES", capacity: 81000 },
  { title: "Premier League — Arsenal vs Liverpool", slug: "pl-arsenal-liverpool-aug-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 65, priceMax: 260, currency: "GBP", releaseAt: fixedDate(2026, 8, 23), hype: 84, demand: 86, sellout: 88, priority: "HIGH", league: "Premier League", city: "London", country: "United Kingdom", countryCode: "GB", capacity: 60704 },
  { title: "NBA Finals Game 7 — Boston", slug: "nba-finals-game7-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 220, priceMax: 1600, currency: "USD", releaseAt: fixedDate(2026, 6, 18), hype: 90, demand: 92, sellout: 94, priority: "EXTREME", league: "NBA", city: "Boston", country: "United States", countryCode: "US", capacity: 19580 },
  { title: "Formula 1 Monaco GP 2026", slug: "f1-monaco-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 160, priceMax: 820, currency: "EUR", releaseAt: fixedDate(2026, 5, 24), hype: 86, demand: 88, sellout: 90, priority: "HIGH", league: "Formula 1", city: "Monaco", country: "Monaco", countryCode: "MC", capacity: 37000 },
  { title: "UFC 320 — Las Vegas", slug: "ufc-320-las-vegas-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 155, priceMax: 1250, currency: "USD", releaseAt: fixedDate(2026, 9, 26), hype: 87, demand: 89, sellout: 91, priority: "HIGH", league: "UFC", city: "Las Vegas", country: "United States", countryCode: "US", capacity: 20000 },
  { title: "Wimbledon Gentlemen's Final 2026", slug: "wimbledon-final-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 110, priceMax: 620, currency: "GBP", releaseAt: fixedDate(2026, 7, 12), hype: 82, demand: 84, sellout: 86, priority: "HIGH", league: "Wimbledon", city: "London", country: "United Kingdom", countryCode: "GB", capacity: 15000 },
  { title: "Tomorrowland 2026 — Weekend 1", slug: "tomorrowland-2026-w1", category: "Festivals", categorySlug: "festivals", type: "ticket", priceMin: 125, priceMax: 410, currency: "EUR", releaseAt: fixedDate(2026, 7, 18), hype: 92, demand: 94, sellout: 95, priority: "EXTREME", league: "Festivals", city: "Boom", country: "Belgium", countryCode: "BE", capacity: 400000 },
  { title: "Six Nations — France vs Ireland", slug: "six-nations-fr-ie-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 70, priceMax: 280, currency: "EUR", releaseAt: fixedDate(2026, 3, 14), hype: 76, demand: 78, sellout: 80, priority: "MEDIUM", league: "Six Nations", city: "Paris", country: "France", countryCode: "FR", capacity: 81000 },
  { title: "EuroLeague Final Four 2026", slug: "euroleague-final-four-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 90, priceMax: 450, currency: "EUR", releaseAt: fixedDate(2026, 5, 16), hype: 70, demand: 72, sellout: 74, priority: "MEDIUM", league: "EuroLeague", city: "Abu Dhabi", country: "UAE", countryCode: "AE", capacity: 12000 },
  { title: "Tour de France — Champs-Élysées Stage", slug: "tdf-champs-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 0, priceMax: 120, currency: "EUR", releaseAt: fixedDate(2026, 7, 26), hype: 65, demand: 68, sellout: 70, priority: "LOW", league: "Cycling", city: "Paris", country: "France", countryCode: "FR", capacity: 500000 },
  { title: "Belgian Pro League — Derby Brugge-Antwerp", slug: "jupiler-derby-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 35, priceMax: 95, currency: "EUR", releaseAt: fixedDate(2026, 10, 4), hype: 58, demand: 60, sellout: 62, priority: "LOW", league: "Jupiler Pro League", city: "Bruges", country: "Belgium", countryCode: "BE", capacity: 29000 },
  { title: "Roland-Garros Men's Final 2026", slug: "roland-garros-final-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 95, priceMax: 480, currency: "EUR", releaseAt: fixedDate(2026, 6, 7), hype: 80, demand: 82, sellout: 84, priority: "HIGH", league: "Tennis", city: "Paris", country: "France", countryCode: "FR", capacity: 15000 },
  { title: "NHL Winter Classic 2027", slug: "nhl-winter-classic-2027", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 130, priceMax: 650, currency: "USD", releaseAt: fixedDate(2027, 1, 2), hype: 74, demand: 76, sellout: 78, priority: "MEDIUM", league: "NHL", city: "Chicago", country: "United States", countryCode: "US", capacity: 35000 },
  { title: "Indy 500 2026", slug: "indy-500-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 45, priceMax: 350, currency: "USD", releaseAt: fixedDate(2026, 5, 24), hype: 72, demand: 74, sellout: 76, priority: "MEDIUM", league: "IndyCar", city: "Indianapolis", country: "United States", countryCode: "US", capacity: 257000 },
  { title: "Glastonbury 2026 — General Sale", slug: "glastonbury-2026", category: "Festivals", categorySlug: "festivals", type: "ticket", priceMin: 355, priceMax: 355, currency: "GBP", releaseAt: fixedDate(2026, 6, 24), hype: 88, demand: 90, sellout: 92, priority: "HIGH", league: "Festivals", city: "Pilton", country: "United Kingdom", countryCode: "GB", capacity: 200000 },
  { title: "Copa América Final 2026", slug: "copa-america-final-2026", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 140, priceMax: 720, currency: "USD", releaseAt: fixedDate(2026, 7, 12), hype: 85, demand: 87, sellout: 89, priority: "HIGH", league: "CONMEBOL", city: "Miami", country: "United States", countryCode: "US", capacity: 65000 },
  { title: "Olympics Opening Ceremony 2028", slug: "olympics-opening-2028", category: "Sport Tickets", categorySlug: "sport-tickets", type: "ticket", priceMin: 200, priceMax: 1200, currency: "USD", releaseAt: fixedDate(2028, 7, 14), hype: 91, demand: 93, sellout: 94, priority: "EXTREME", league: "Olympics", city: "Los Angeles", country: "United States", countryCode: "US", capacity: 70000 },

  // Sneakers (15)
  { title: "Air Jordan 1 Travis Scott Medium Olive", slug: "aj1-travis-medium-olive", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 150, priceMax: 150, currency: "EUR", releaseAt: fixedDate(2026, 4, 5), hype: 94, demand: 92, sellout: 96, priority: "EXTREME", brand: "Jordan", stock: 6000, marketPrice: 420 },
  { title: "Nike Dunk Low Panda Restock", slug: "dunk-low-panda-restock", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 110, priceMax: 110, currency: "EUR", releaseAt: fixedDate(2026, 3, 28), hype: 62, demand: 58, sellout: 68, priority: "LOW", brand: "Nike", stock: 85000, marketPrice: 125 },
  { title: "Nike Mercurial Superfly Elite", slug: "mercurial-superfly-elite", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 220, priceMax: 220, currency: "EUR", releaseAt: fixedDate(2026, 5, 10), hype: 78, demand: 75, sellout: 82, priority: "HIGH", brand: "Nike", stock: 4000, marketPrice: 310 },
  { title: "Nike Phantom GX Elite Drop", slug: "phantom-gx-elite", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 250, priceMax: 250, currency: "EUR", releaseAt: fixedDate(2026, 6, 2), hype: 74, demand: 71, sellout: 78, priority: "MEDIUM", brand: "Nike", stock: 3500, marketPrice: 295 },
  { title: "Adidas F50 Elite Limited", slug: "adidas-f50-elite", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 280, priceMax: 280, currency: "EUR", releaseAt: fixedDate(2026, 4, 18), hype: 72, demand: 69, sellout: 76, priority: "MEDIUM", brand: "Adidas", stock: 2800, marketPrice: 340 },
  { title: "New Balance 550 x Aime Leon Dore", slug: "nb550-ald", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 140, priceMax: 140, currency: "EUR", releaseAt: fixedDate(2026, 5, 22), hype: 80, demand: 77, sellout: 85, priority: "HIGH", brand: "New Balance", stock: 4500, marketPrice: 265 },
  { title: "Nike Air Max 1 OG Red", slug: "air-max-1-og-red", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 160, priceMax: 160, currency: "EUR", releaseAt: fixedDate(2026, 3, 21), hype: 68, demand: 65, sellout: 72, priority: "MEDIUM", brand: "Nike", stock: 12000, marketPrice: 195 },
  { title: "Yeezy Slide Slate Grey Restock", slug: "yeezy-slide-slate", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 70, priceMax: 70, currency: "EUR", releaseAt: fixedDate(2026, 4, 12), hype: 55, demand: 52, sellout: 58, priority: "LOW", brand: "Adidas", stock: 120000, marketPrice: 78 },
  { title: "Nike SB Dunk Low Pro J-Pack Chicago", slug: "sb-dunk-jpack-chicago", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 115, priceMax: 115, currency: "EUR", releaseAt: fixedDate(2026, 6, 14), hype: 76, demand: 73, sellout: 80, priority: "HIGH", brand: "Nike", stock: 7000, marketPrice: 210 },
  { title: "Salomon XT-6 Gorpcore Drop", slug: "salomon-xt6-drop", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 180, priceMax: 180, currency: "EUR", releaseAt: fixedDate(2026, 5, 5), hype: 64, demand: 61, sellout: 66, priority: "LOW", brand: "Salomon", stock: 9000, marketPrice: 205 },
  { title: "Asics Gel-Kayano 14 Silver", slug: "asics-kayano-14-silver", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 150, priceMax: 150, currency: "EUR", releaseAt: fixedDate(2026, 4, 30), hype: 58, demand: 55, sellout: 60, priority: "LOW", brand: "Asics", stock: 15000, marketPrice: 168 },
  { title: "Nike Air Force 1 Low Luxe", slug: "af1-low-luxe", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 130, priceMax: 130, currency: "EUR", releaseAt: fixedDate(2026, 3, 15), hype: 52, demand: 50, sellout: 55, priority: "LOW", brand: "Nike", stock: 25000, marketPrice: 142 },
  { title: "Jordan 4 Military Blue", slug: "jordan-4-military-blue", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 210, priceMax: 210, currency: "EUR", releaseAt: fixedDate(2026, 5, 28), hype: 82, demand: 79, sellout: 86, priority: "HIGH", brand: "Jordan", stock: 11000, marketPrice: 285 },
  { title: "Adidas Samba OG White", slug: "samba-og-white", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 120, priceMax: 120, currency: "EUR", releaseAt: fixedDate(2026, 3, 8), hype: 48, demand: 46, sellout: 50, priority: "LOW", brand: "Adidas", stock: 40000, marketPrice: 128 },
  { title: "Nike Zoom Vomero 5 Photon Dust", slug: "vomero-5-photon", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 170, priceMax: 170, currency: "EUR", releaseAt: fixedDate(2026, 6, 20), hype: 66, demand: 63, sellout: 68, priority: "MEDIUM", brand: "Nike", stock: 18000, marketPrice: 198 },

  // TCG (15)
  { title: "Pokémon Mega Evolution Charizard Collection", slug: "pokemon-charizard-collection", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 49, priceMax: 49, currency: "EUR", releaseAt: fixedDate(2026, 4, 8), hype: 88, demand: 86, sellout: 90, priority: "EXTREME", tcgName: "Pokémon", setName: "Mega Evolution", productType: "collection", rarity: "Ultra Rare", sealed: true, msrp: 49, marketPrice: 95, stock: 8000 },
  { title: "Pokémon 151 Ultra Premium Collection", slug: "pokemon-151-upc", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 120, priceMax: 120, currency: "EUR", releaseAt: fixedDate(2026, 5, 15), hype: 90, demand: 88, sellout: 92, priority: "EXTREME", tcgName: "Pokémon", setName: "151", productType: "UPC", sealed: true, msrp: 120, marketPrice: 210, stock: 5000 },
  { title: "One Piece OP-12 Booster Box", slug: "one-piece-op12-box", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 110, priceMax: 110, currency: "EUR", releaseAt: fixedDate(2026, 4, 22), hype: 84, demand: 82, sellout: 86, priority: "HIGH", tcgName: "One Piece", setName: "OP-12", productType: "booster_box", sealed: true, msrp: 110, marketPrice: 165, stock: 6000 },
  { title: "Lorcana Chapter 8 Collector Set", slug: "lorcana-ch8-collector", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 55, priceMax: 55, currency: "EUR", releaseAt: fixedDate(2026, 5, 30), hype: 72, demand: 70, sellout: 74, priority: "MEDIUM", tcgName: "Lorcana", setName: "Chapter 8", productType: "collector_set", rarity: "Legendary", sealed: true, msrp: 55, marketPrice: 88, stock: 7000 },
  { title: "Magic Secret Lair — Doctor Who", slug: "magic-secret-lair-doctor-who", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 38, priceMax: 38, currency: "EUR", releaseAt: fixedDate(2026, 3, 25), hype: 68, demand: 66, sellout: 70, priority: "MEDIUM", tcgName: "Magic", setName: "Secret Lair", productType: "secret_lair", rarity: "Mythic", sealed: true, msrp: 38, marketPrice: 62, stock: 10000 },
  { title: "Yu-Gi-Oh Quarter Century Bonanza Box", slug: "yugioh-quarter-century", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 75, priceMax: 75, currency: "EUR", releaseAt: fixedDate(2026, 6, 5), hype: 70, demand: 68, sellout: 72, priority: "MEDIUM", tcgName: "Yu-Gi-Oh", setName: "Quarter Century", productType: "booster_box", sealed: true, msrp: 75, marketPrice: 105, stock: 5500 },
  { title: "Topps Chrome 2026 Hobby Box", slug: "topps-chrome-2026-hobby", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 230, priceMax: 230, currency: "EUR", releaseAt: fixedDate(2026, 4, 14), hype: 65, demand: 63, sellout: 66, priority: "LOW", tcgName: "Sports Cards", setName: "Topps Chrome 2026", productType: "hobby_box", sealed: true, msrp: 230, marketPrice: 275, stock: 3000 },
  { title: "Pokémon Prismatic ETB", slug: "pokemon-prismatic-etb", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 52, priceMax: 52, currency: "EUR", releaseAt: fixedDate(2026, 5, 8), hype: 80, demand: 78, sellout: 82, priority: "HIGH", tcgName: "Pokémon", setName: "Prismatic Evolutions", productType: "ETB", sealed: true, msrp: 52, marketPrice: 78, stock: 12000 },
  { title: "Pokémon Paldean Fates Tin", slug: "pokemon-paldean-fates-tin", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 28, priceMax: 28, currency: "EUR", releaseAt: fixedDate(2026, 3, 18), hype: 58, demand: 56, sellout: 60, priority: "LOW", tcgName: "Pokémon", setName: "Paldean Fates", productType: "tin", sealed: true, msrp: 28, marketPrice: 38, stock: 20000 },
  { title: "One Piece Starter Deck EX", slug: "one-piece-starter-ex", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 18, priceMax: 18, currency: "EUR", releaseAt: fixedDate(2026, 4, 2), hype: 52, demand: 50, sellout: 54, priority: "LOW", tcgName: "One Piece", setName: "Starter EX", productType: "starter", sealed: true, msrp: 18, marketPrice: 24, stock: 25000 },
  { title: "Lorcana Illumineer's Quest", slug: "lorcana-illumineers-quest", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 45, priceMax: 45, currency: "EUR", releaseAt: fixedDate(2026, 6, 12), hype: 60, demand: 58, sellout: 62, priority: "LOW", tcgName: "Lorcana", setName: "Illumineer's Quest", productType: "box", sealed: true, msrp: 45, marketPrice: 58, stock: 9000 },
  { title: "Magic Modern Horizons 3 Box", slug: "magic-mh3-box", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 280, priceMax: 280, currency: "EUR", releaseAt: fixedDate(2026, 6, 28), hype: 78, demand: 76, sellout: 80, priority: "HIGH", tcgName: "Magic", setName: "Modern Horizons 3", productType: "booster_box", sealed: true, msrp: 280, marketPrice: 340, stock: 4000 },
  { title: "Pokémon Crown Zenith ETB", slug: "pokemon-crown-zenith-etb", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 48, priceMax: 48, currency: "EUR", releaseAt: fixedDate(2026, 3, 12), hype: 66, demand: 64, sellout: 68, priority: "MEDIUM", tcgName: "Pokémon", setName: "Crown Zenith", productType: "ETB", sealed: true, msrp: 48, marketPrice: 72, stock: 14000 },
  { title: "Yu-Gi-Oh Structure Deck Fire Kings", slug: "yugioh-fire-kings-deck", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 14, priceMax: 14, currency: "EUR", releaseAt: fixedDate(2026, 5, 2), hype: 44, demand: 42, sellout: 46, priority: "LOW", tcgName: "Yu-Gi-Oh", setName: "Fire Kings", productType: "structure_deck", sealed: true, msrp: 14, marketPrice: 18, stock: 30000 },
  { title: "Pokémon Surging Sparks Booster Bundle", slug: "pokemon-surging-sparks-bundle", category: "TCG & Collectibles", categorySlug: "tcg-collectibles", type: "collectible", priceMin: 32, priceMax: 32, currency: "EUR", releaseAt: fixedDate(2026, 4, 26), hype: 62, demand: 60, sellout: 64, priority: "MEDIUM", tcgName: "Pokémon", setName: "Surging Sparks", productType: "bundle", sealed: true, msrp: 32, marketPrice: 44, stock: 16000 },

  // Fashion / Gaming (10)
  { title: "Supreme Box Logo Hoodie FW26", slug: "supreme-box-logo-fw26", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion", priceMin: 168, priceMax: 168, currency: "EUR", releaseAt: fixedDate(2026, 9, 4), hype: 86, demand: 84, sellout: 88, priority: "HIGH", brand: "Supreme", stock: 2000, marketPrice: 320 },
  { title: "Palace Tri-Ferg Drop", slug: "palace-tri-ferg", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion", priceMin: 58, priceMax: 120, currency: "EUR", releaseAt: fixedDate(2026, 4, 16), hype: 72, demand: 70, sellout: 74, priority: "MEDIUM", brand: "Palace", stock: 3500, marketPrice: 95 },
  { title: "PlayStation 5 Pro Bundle", slug: "ps5-pro-bundle", category: "Gaming", categorySlug: "gaming", type: "gaming", priceMin: 599, priceMax: 699, currency: "EUR", releaseAt: fixedDate(2026, 5, 20), hype: 78, demand: 76, sellout: 80, priority: "HIGH", brand: "Sony", stock: 15000, marketPrice: 720 },
  { title: "Nintendo Switch 2 Launch Bundle", slug: "switch-2-launch", category: "Gaming", categorySlug: "gaming", type: "gaming", priceMin: 449, priceMax: 499, currency: "EUR", releaseAt: fixedDate(2026, 6, 6), hype: 92, demand: 90, sellout: 93, priority: "EXTREME", brand: "Nintendo", stock: 50000, marketPrice: 620 },
  { title: "Kith x BMW Collection", slug: "kith-bmw-collection", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion", priceMin: 85, priceMax: 350, currency: "EUR", releaseAt: fixedDate(2026, 7, 11), hype: 74, demand: 72, sellout: 76, priority: "MEDIUM", brand: "Kith", stock: 1500, marketPrice: 180 },
  { title: "Stüssy World Tour Tee Drop", slug: "stussy-world-tour", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion", priceMin: 45, priceMax: 45, currency: "EUR", releaseAt: fixedDate(2026, 3, 20), hype: 58, demand: 56, sellout: 60, priority: "LOW", brand: "Stüssy", stock: 8000, marketPrice: 62 },
  { title: "Off-White x Nike Air Terra", slug: "off-white-nike-terra", category: "Limited Sneakers", categorySlug: "limited-sneakers", type: "product", priceMin: 190, priceMax: 190, currency: "EUR", releaseAt: fixedDate(2026, 8, 15), hype: 88, demand: 85, sellout: 90, priority: "EXTREME", brand: "Nike", stock: 2500, marketPrice: 450 },
  { title: "Xbox Series X Elite Bundle", slug: "xbox-series-x-elite", category: "Gaming", categorySlug: "gaming", type: "gaming", priceMin: 549, priceMax: 599, currency: "EUR", releaseAt: fixedDate(2026, 11, 20), hype: 68, demand: 66, sellout: 70, priority: "MEDIUM", brand: "Microsoft", stock: 22000, marketPrice: 590 },
  { title: "Fear of God Essentials Drop", slug: "fog-essentials-drop", category: "Fashion Drops", categorySlug: "fashion-drops", type: "fashion", priceMin: 90, priceMax: 220, currency: "EUR", releaseAt: fixedDate(2026, 5, 1), hype: 64, demand: 62, sellout: 66, priority: "LOW", brand: "Fear of God", stock: 12000, marketPrice: 115 },
  { title: "Steam Deck OLED Limited", slug: "steam-deck-oled-ltd", category: "Gaming", categorySlug: "gaming", type: "gaming", priceMin: 569, priceMax: 569, currency: "EUR", releaseAt: fixedDate(2026, 4, 10), hype: 70, demand: 68, sellout: 72, priority: "MEDIUM", brand: "Valve", stock: 18000, marketPrice: 610 },
];

export function generateMockReleases(): Release[] {
  const now = new Date();
  return MOCK_SPECS.map((spec, idx) => buildRelease(idx + 1, spec, now));
}
