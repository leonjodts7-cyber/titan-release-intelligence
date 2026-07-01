import type { Release, ReleaseFilters } from "@/types";
import { createServiceClient, createAnonServiceClient } from "@/lib/supabase/admin";

function getClient() {
  try {
    return createServiceClient();
  } catch {
    return createAnonServiceClient();
  }
}

const RELEASE_SELECT = `
  *,
  release_categories(name, slug),
  brands(name),
  artists(name),
  sports_leagues(name),
  countries(name, code),
  cities(name),
  venues(name, capacity)
`;

export async function getReleases(filters: ReleaseFilters = {}): Promise<Release[]> {
  const supabase = getClient();
  let query = supabase.from("releases").select(RELEASE_SELECT);

  if (filters.category) {
    query = query.eq("release_categories.slug", filters.category);
  }
  if (filters.priority) {
    query = query.eq("priority_level", filters.priority);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    query = query.textSearch("search_vector", filters.search, { type: "websearch" });
  }

  switch (filters.sort) {
    case "date":
      query = query.order("release_starts_at", { ascending: true, nullsFirst: false });
      break;
    case "hype":
      query = query.order("hype_score", { ascending: false });
      break;
    case "sellout":
      query = query.order("sellout_probability", { ascending: false });
      break;
    default:
      query = query.order("priority_level", { ascending: true }).order("hype_score", { ascending: false });
  }

  query = query.limit(filters.limit ?? 100);

  const { data, error } = await query;
  if (error) {
    console.error("getReleases error:", error.message);
    return getMockReleases(filters);
  }
  return (data as Release[]) ?? [];
}

export async function getReleaseById(id: string): Promise<Release | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    const mock = getMockReleases().find((r) => r.id === id);
    return mock ?? null;
  }
  return data as Release;
}

export async function getReleaseBySlug(slug: string): Promise<Release | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("slug", slug)
    .single();

  if (error) {
    const mock = getMockReleases().find((r) => r.slug === slug);
    return mock ?? null;
  }
  return data as Release;
}

export function getMockReleases(filters: ReleaseFilters = {}): Release[] {
  const now = new Date();
  const addDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

  const releases: Release[] = [
    {
      id: "1", title: "Coldplay Europe Tour 2026", slug: "coldplay-europe-tour-2026",
      category_id: "c1", brand_id: null, artist_id: "a1", league_id: null,
      team_home_id: null, team_away_id: null, venue_id: "v1", country_id: "co1", city_id: "ci1",
      release_type: "ticket", status: "announced",
      official_url: "https://www.ticketmaster.co.uk/coldplay",
      source_url: "https://www.ticketmaster.com", image_url: null,
      description: "Coldplay Music of the Spheres World Tour - European leg",
      announced_at: addDays(-3), presale_starts_at: addDays(2), general_sale_starts_at: addDays(5),
      release_starts_at: addDays(30), release_ends_at: null, timezone: "Europe/London",
      price_min: 75, price_max: 250, currency: "GBP", stock_estimate: null, capacity_estimate: 90000,
      hype_score: 92, demand_score: 95, urgency_score: 78, sellout_probability: 98,
      resale_interest_score: 90, confidence_score: 88, priority_level: "EXTREME",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-1),
      source_adapter_id: "s1", external_id: null, created_at: addDays(-3), updated_at: addDays(-1),
      release_categories: { name: "Concert Tickets", slug: "concert-tickets" },
      artists: { name: "Coldplay" }, countries: { name: "United Kingdom", code: "GB" },
      cities: { name: "London" }, venues: { name: "Wembley Stadium", capacity: 90000 },
    },
    {
      id: "2", title: "Taylor Swift Stadium Show London", slug: "taylor-swift-stadium-show-london",
      category_id: "c1", brand_id: null, artist_id: "a2", league_id: null,
      team_home_id: null, team_away_id: null, venue_id: "v1", country_id: "co1", city_id: "ci1",
      release_type: "ticket", status: "presale",
      official_url: "https://www.ticketmaster.co.uk/taylor-swift",
      source_url: "https://www.ticketmaster.com", image_url: null,
      description: "Taylor Swift Eras Tour - additional London date",
      announced_at: addDays(-7), presale_starts_at: addDays(-1), general_sale_starts_at: addDays(3),
      release_starts_at: addDays(45), release_ends_at: null, timezone: "Europe/London",
      price_min: 85, price_max: 350, currency: "GBP", stock_estimate: null, capacity_estimate: 90000,
      hype_score: 98, demand_score: 99, urgency_score: 85, sellout_probability: 99,
      resale_interest_score: 95, confidence_score: 92, priority_level: "EXTREME",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-2),
      source_adapter_id: "s1", external_id: null, created_at: addDays(-7), updated_at: addDays(-2),
      release_categories: { name: "Concert Tickets", slug: "concert-tickets" },
      artists: { name: "Taylor Swift" }, countries: { name: "United Kingdom", code: "GB" },
      cities: { name: "London" }, venues: { name: "Wembley Stadium", capacity: 90000 },
    },
    {
      id: "3", title: "UEFA Champions League Final 2026", slug: "uefa-champions-league-final-2026",
      category_id: "c5", brand_id: null, artist_id: null, league_id: "l1",
      team_home_id: null, team_away_id: null, venue_id: null, country_id: "co3", city_id: "ci3",
      release_type: "ticket", status: "announced",
      official_url: "https://www.uefa.com/tickets", source_url: "https://www.uefa.com", image_url: null,
      description: "Champions League Final 2026 ticket ballot",
      announced_at: addDays(-14), presale_starts_at: addDays(30), general_sale_starts_at: addDays(60),
      release_starts_at: addDays(120), release_ends_at: null, timezone: "Europe/Amsterdam",
      price_min: 150, price_max: 800, currency: "EUR", stock_estimate: null, capacity_estimate: 55000,
      hype_score: 96, demand_score: 97, urgency_score: 60, sellout_probability: 95,
      resale_interest_score: 92, confidence_score: 90, priority_level: "EXTREME",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-5),
      source_adapter_id: "s7", external_id: null, created_at: addDays(-14), updated_at: addDays(-5),
      release_categories: { name: "Champions League", slug: "champions-league" },
      sports_leagues: { name: "UEFA Champions League" },
      countries: { name: "Netherlands", code: "NL" }, cities: { name: "Amsterdam" },
    },
    {
      id: "4", title: "Super Bowl LX", slug: "super-bowl-lx",
      category_id: "c4", brand_id: null, artist_id: null, league_id: "l2",
      team_home_id: null, team_away_id: null, venue_id: "v3", country_id: "co2", city_id: "ci2",
      release_type: "ticket", status: "announced",
      official_url: "https://www.nfl.com/super-bowl/tickets", source_url: "https://www.nfl.com", image_url: null,
      description: "Super Bowl LX ticket lottery",
      announced_at: addDays(-30), presale_starts_at: addDays(60), general_sale_starts_at: addDays(90),
      release_starts_at: addDays(180), release_ends_at: null, timezone: "America/Los_Angeles",
      price_min: 500, price_max: 5000, currency: "USD", stock_estimate: null, capacity_estimate: 65000,
      hype_score: 99, demand_score: 99, urgency_score: 40, sellout_probability: 99,
      resale_interest_score: 98, confidence_score: 95, priority_level: "EXTREME",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-10),
      source_adapter_id: "s9", external_id: null, created_at: addDays(-30), updated_at: addDays(-10),
      release_categories: { name: "Super Bowl", slug: "super-bowl" },
      sports_leagues: { name: "NFL" },
      countries: { name: "United States", code: "US" }, cities: { name: "Las Vegas" },
      venues: { name: "Allegiant Stadium", capacity: 65000 },
    },
    {
      id: "5", title: "Nike Mercurial Limited Drop", slug: "nike-mercurial-limited-drop",
      category_id: "c9", brand_id: "b1", artist_id: null, league_id: null,
      team_home_id: null, team_away_id: null, venue_id: null, country_id: null, city_id: null,
      release_type: "product", status: "announced",
      official_url: "https://www.nike.com/launch/t/mercurial-limited",
      source_url: "https://www.nike.com/launch", image_url: null,
      description: "Limited edition Nike Mercurial Superfly - SNKRS exclusive",
      announced_at: addDays(-2), presale_starts_at: null, general_sale_starts_at: addDays(1),
      release_starts_at: addDays(1), release_ends_at: null, timezone: "UTC",
      price_min: 220, price_max: 220, currency: "EUR", stock_estimate: 5000, capacity_estimate: 5000,
      hype_score: 88, demand_score: 91, urgency_score: 90, sellout_probability: 94,
      resale_interest_score: 85, confidence_score: 85, priority_level: "HIGH",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-1),
      source_adapter_id: "s5", external_id: null, created_at: addDays(-2), updated_at: addDays(-1),
      release_categories: { name: "Nike Football Boots", slug: "nike-football-boots" },
      brands: { name: "Nike" },
    },
    {
      id: "6", title: "Nike Phantom Elite Drop", slug: "nike-phantom-elite-drop",
      category_id: "c9", brand_id: "b1", artist_id: null, league_id: null,
      team_home_id: null, team_away_id: null, venue_id: null, country_id: null, city_id: null,
      release_type: "product", status: "announced",
      official_url: "https://www.nike.com/launch/t/phantom-elite",
      source_url: "https://www.nike.com/launch", image_url: null,
      description: "Nike Phantom GX Elite limited colorway",
      announced_at: addDays(-1), presale_starts_at: null, general_sale_starts_at: addDays(3),
      release_starts_at: addDays(3), release_ends_at: null, timezone: "UTC",
      price_min: 250, price_max: 250, currency: "EUR", stock_estimate: 3000, capacity_estimate: 3000,
      hype_score: 82, demand_score: 85, urgency_score: 70, sellout_probability: 88,
      resale_interest_score: 80, confidence_score: 82, priority_level: "HIGH",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-1),
      source_adapter_id: "s5", external_id: null, created_at: addDays(-1), updated_at: addDays(-1),
      release_categories: { name: "Nike Football Boots", slug: "nike-football-boots" },
      brands: { name: "Nike" },
    },
    {
      id: "7", title: "Adidas F50 Limited", slug: "adidas-f50-limited",
      category_id: "c10", brand_id: "b3", artist_id: null, league_id: null,
      team_home_id: null, team_away_id: null, venue_id: null, country_id: null, city_id: null,
      release_type: "product", status: "announced",
      official_url: "https://www.adidas.com/f50-limited",
      source_url: "https://www.adidas.com/confirmed", image_url: null,
      description: "Adidas F50 Elite limited drop on Confirmed app",
      announced_at: addDays(-1), presale_starts_at: null, general_sale_starts_at: addDays(2),
      release_starts_at: addDays(2), release_ends_at: null, timezone: "UTC",
      price_min: 280, price_max: 280, currency: "EUR", stock_estimate: 2500, capacity_estimate: 2500,
      hype_score: 80, demand_score: 83, urgency_score: 75, sellout_probability: 86,
      resale_interest_score: 78, confidence_score: 80, priority_level: "HIGH",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-1),
      source_adapter_id: "s6", external_id: null, created_at: addDays(-1), updated_at: addDays(-1),
      release_categories: { name: "Adidas Drops", slug: "adidas-drops" },
      brands: { name: "Adidas" },
    },
    {
      id: "8", title: "Jordan x Travis Scott Drop", slug: "jordan-travis-scott-drop",
      category_id: "c11", brand_id: "b2", artist_id: "a3", league_id: null,
      team_home_id: null, team_away_id: null, venue_id: null, country_id: null, city_id: null,
      release_type: "product", status: "rumored",
      official_url: "https://www.nike.com/launch/t/travis-scott",
      source_url: "https://www.nike.com/launch", image_url: null,
      description: "Air Jordan 1 Low OG Travis Scott collaboration",
      announced_at: null, presale_starts_at: null, general_sale_starts_at: addDays(7),
      release_starts_at: addDays(7), release_ends_at: null, timezone: "UTC",
      price_min: 150, price_max: 150, currency: "EUR", stock_estimate: 10000, capacity_estimate: 10000,
      hype_score: 95, demand_score: 97, urgency_score: 50, sellout_probability: 99,
      resale_interest_score: 96, confidence_score: 75, priority_level: "EXTREME",
      last_checked_at: now.toISOString(), last_changed_at: null,
      source_adapter_id: "s5", external_id: null, created_at: addDays(-1), updated_at: addDays(-1),
      release_categories: { name: "Limited Sneakers", slug: "limited-sneakers" },
      brands: { name: "Jordan" }, artists: { name: "Travis Scott" },
    },
    {
      id: "9", title: "Tomorrowland 2026 Ticket Sale", slug: "tomorrowland-2026-ticket-sale",
      category_id: "c7", brand_id: null, artist_id: null, league_id: null,
      team_home_id: null, team_away_id: null, venue_id: null, country_id: "co4", city_id: "ci4",
      release_type: "ticket", status: "announced",
      official_url: "https://www.tomorrowland.com/tickets",
      source_url: "https://www.tomorrowland.com", image_url: null,
      description: "Tomorrowland 2026 worldwide ticket sale",
      announced_at: addDays(-5), presale_starts_at: addDays(10), general_sale_starts_at: addDays(14),
      release_starts_at: addDays(200), release_ends_at: null, timezone: "Europe/Brussels",
      price_min: 120, price_max: 400, currency: "EUR", stock_estimate: null, capacity_estimate: 400000,
      hype_score: 94, demand_score: 96, urgency_score: 55, sellout_probability: 97,
      resale_interest_score: 93, confidence_score: 90, priority_level: "EXTREME",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-3),
      source_adapter_id: "s3", external_id: null, created_at: addDays(-5), updated_at: addDays(-3),
      release_categories: { name: "Festivals", slug: "festivals" },
      countries: { name: "Belgium", code: "BE" }, cities: { name: "Boom" },
    },
    {
      id: "10", title: "Formula 1 Belgian Grand Prix 2026", slug: "formula-1-belgian-gp-2026",
      category_id: "c2", brand_id: null, artist_id: null, league_id: "l4",
      team_home_id: null, team_away_id: null, venue_id: null, country_id: "co4", city_id: "ci4",
      release_type: "ticket", status: "announced",
      official_url: "https://www.formula1.com/en/racing/2026/belgium/tickets",
      source_url: "https://www.formula1.com", image_url: null,
      description: "Belgian Grand Prix Spa-Francorchamps ticket presale",
      announced_at: addDays(-10), presale_starts_at: addDays(5), general_sale_starts_at: addDays(20),
      release_starts_at: addDays(150), release_ends_at: null, timezone: "Europe/Brussels",
      price_min: 80, price_max: 450, currency: "EUR", stock_estimate: null, capacity_estimate: 70000,
      hype_score: 78, demand_score: 80, urgency_score: 45, sellout_probability: 82,
      resale_interest_score: 75, confidence_score: 85, priority_level: "MEDIUM",
      last_checked_at: now.toISOString(), last_changed_at: addDays(-4),
      source_adapter_id: "s11", external_id: null, created_at: addDays(-10), updated_at: addDays(-4),
      release_categories: { name: "Sport Tickets", slug: "sport-tickets" },
      sports_leagues: { name: "Formula 1" },
      countries: { name: "Belgium", code: "BE" }, cities: { name: "Spa" },
    },
  ];

  let filtered = releases;
  if (filters.priority) filtered = filtered.filter((r) => r.priority_level === filters.priority);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((r) => r.title.toLowerCase().includes(q));
  }
  if (filters.limit) filtered = filtered.slice(0, filters.limit);
  return filtered;
}
