/**
 * One-time seed: writes V2 mock releases into Supabase.
 * Run: npx tsx scripts/seed.ts
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateMockReleases } from "../src/lib/data/mock-releases";
import type { Release } from "../src/types";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing .env.local — copy .env.example and add Supabase keys.");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const CATEGORY_ICONS: Record<string, string> = {
  "concert-tickets": "music",
  "sport-tickets": "trophy",
  "football-matches": "football",
  "super-bowl": "football",
  "champions-league": "trophy",
  "premier-league": "football",
  "festivals": "festival",
  "nike-drops": "shoe",
  "limited-sneakers": "shoe",
  "fashion-drops": "shirt",
  "gaming": "gamepad",
  "gaming-drops": "gamepad",
  "tcg-collectibles": "box",
  "collectibles": "box",
  "world-cup": "trophy",
};

const idCache = {
  category: new Map<string, string>(),
  brand: new Map<string, string>(),
  artist: new Map<string, string>(),
  league: new Map<string, string>(),
  country: new Map<string, string>(),
  city: new Map<string, string>(),
  venue: new Map<string, string>(),
  sourceAdapter: null as string | null,
};

async function upsertCategory(
  supabase: SupabaseClient,
  name: string,
  slug: string
): Promise<string> {
  const hit = idCache.category.get(slug);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("release_categories")
    .upsert({ name, slug, icon: CATEGORY_ICONS[slug] ?? "box" }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(`category ${slug}: ${error.message}`);
  idCache.category.set(slug, data.id);
  return data.id;
}

async function upsertBrand(supabase: SupabaseClient, name: string): Promise<string> {
  const slug = slugify(name);
  const hit = idCache.brand.get(slug);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("brands")
    .upsert({ name, slug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(`brand ${name}: ${error.message}`);
  idCache.brand.set(slug, data.id);
  return data.id;
}

async function upsertArtist(supabase: SupabaseClient, name: string): Promise<string> {
  const slug = slugify(name);
  const hit = idCache.artist.get(slug);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("artists")
    .upsert({ name, slug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(`artist ${name}: ${error.message}`);
  idCache.artist.set(slug, data.id);
  return data.id;
}

async function upsertLeague(supabase: SupabaseClient, name: string): Promise<string> {
  const slug = slugify(name);
  const hit = idCache.league.get(slug);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("sports_leagues")
    .upsert({ name, slug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(`league ${name}: ${error.message}`);
  idCache.league.set(slug, data.id);
  return data.id;
}

async function upsertCountry(
  supabase: SupabaseClient,
  name: string,
  code: string
): Promise<string> {
  const hit = idCache.country.get(code);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("countries")
    .upsert({ name, code }, { onConflict: "code" })
    .select("id")
    .single();
  if (error) throw new Error(`country ${code}: ${error.message}`);
  idCache.country.set(code, data.id);
  return data.id;
}

async function upsertCity(
  supabase: SupabaseClient,
  name: string,
  countryId: string
): Promise<string> {
  const key = `${countryId}:${name}`;
  const hit = idCache.city.get(key);
  if (hit) return hit;
  const { data: existing } = await supabase
    .from("cities")
    .select("id")
    .eq("name", name)
    .eq("country_id", countryId)
    .maybeSingle();
  if (existing) {
    idCache.city.set(key, existing.id);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("cities")
    .insert({ name, country_id: countryId })
    .select("id")
    .single();
  if (error) throw new Error(`city ${name}: ${error.message}`);
  idCache.city.set(key, data.id);
  return data.id;
}

async function upsertVenue(
  supabase: SupabaseClient,
  name: string,
  cityId: string,
  capacity: number | null
): Promise<string> {
  const slug = slugify(name);
  const hit = idCache.venue.get(slug);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("venues")
    .upsert({ name, slug, city_id: cityId, capacity }, { onConflict: "slug" })
    .select("id")
    .single();
  if (error) throw new Error(`venue ${name}: ${error.message}`);
  idCache.venue.set(slug, data.id);
  return data.id;
}

async function getSourceAdapterId(supabase: SupabaseClient): Promise<string | null> {
  if (idCache.sourceAdapter) return idCache.sourceAdapter;
  const { data } = await supabase.from("source_adapters").select("id").limit(1).maybeSingle();
  if (data?.id) {
    idCache.sourceAdapter = data.id;
    return data.id;
  }
  const { data: inserted, error } = await supabase
    .from("source_adapters")
    .insert({ name: "TITAN Seed", source_type: "mock", enabled: true })
    .select("id")
    .single();
  if (error) throw new Error(`source_adapter: ${error.message}`);
  idCache.sourceAdapter = inserted.id;
  return inserted.id;
}

async function releaseToRow(supabase: SupabaseClient, r: Release) {
  const catSlug = r.release_categories?.slug ?? "other";
  const catName = r.release_categories?.name ?? catSlug;
  const categoryId = await upsertCategory(supabase, catName, catSlug);

  const brandId = r.brands?.name ? await upsertBrand(supabase, r.brands.name) : null;
  const artistId = r.artists?.name ? await upsertArtist(supabase, r.artists.name) : null;
  const leagueId = r.sports_leagues?.name
    ? await upsertLeague(supabase, r.sports_leagues.name)
    : null;

  let countryId: string | null = null;
  let cityId: string | null = null;
  let venueId: string | null = null;

  if (r.countries?.code && r.countries.name) {
    countryId = await upsertCountry(supabase, r.countries.name, r.countries.code);
    if (r.cities?.name) {
      cityId = await upsertCity(supabase, r.cities.name, countryId);
      if (r.venues?.name && cityId) {
        venueId = await upsertVenue(supabase, r.venues.name, cityId, r.venues.capacity ?? null);
      }
    }
  }

  const sourceAdapterId = await getSourceAdapterId(supabase);

  return {
    title: r.title,
    slug: r.slug,
    category_id: categoryId,
    brand_id: brandId,
    artist_id: artistId,
    league_id: leagueId,
    venue_id: venueId,
    country_id: countryId,
    city_id: cityId,
    release_type: r.release_type,
    status: r.status,
    official_url: r.official_url,
    source_url: r.source_url,
    image_url: r.image_url,
    description: r.description,
    announced_at: r.announced_at,
    presale_starts_at: r.presale_starts_at,
    general_sale_starts_at: r.general_sale_starts_at,
    release_starts_at: r.release_starts_at,
    release_ends_at: r.release_ends_at,
    timezone: r.timezone,
    price_min: r.price_min,
    price_max: r.price_max,
    currency: r.currency,
    stock_estimate: r.stock_estimate,
    capacity_estimate: r.capacity_estimate,
    hype_score: r.hype_score,
    demand_score: r.demand_score,
    urgency_score: r.urgency_score,
    sellout_probability: r.sellout_probability,
    resale_interest_score: r.resale_interest_score,
    confidence_score: r.confidence_score,
    priority_level: r.priority_level,
    last_checked_at: r.last_checked_at,
    last_changed_at: r.last_changed_at,
    source_adapter_id: sourceAdapterId,
    external_id: r.external_id,
    tcg_name: r.tcg_name,
    set_name: r.set_name,
    product_type_tcg: r.product_type_tcg,
    card_rarity: r.card_rarity,
    sealed_product: r.sealed_product,
    msrp: r.msrp,
    market_price: r.market_price,
    updated_at: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: pingError } = await supabase
    .from("releases")
    .select("id", { count: "exact", head: true });
  if (pingError) {
    console.error("Supabase ping failed — run migrations first:", pingError.message);
    process.exit(1);
  }

  const releases = generateMockReleases();
  console.log(`Seeding ${releases.length} mock releases into Supabase…`);

  let ok = 0;
  const failures: string[] = [];

  for (const release of releases) {
    try {
      const row = await releaseToRow(supabase, release);
      const { error } = await supabase.from("releases").upsert(row, { onConflict: "slug" });
      if (error) failures.push(`${release.slug}: ${error.message}`);
      else ok++;
    } catch (e) {
      failures.push(`${release.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`Done: ${ok}/${releases.length} releases upserted.`);
  if (failures.length > 0) {
    console.error("Failures:");
    failures.slice(0, 10).forEach((f) => console.error(`  - ${f}`));
    if (failures.length > 10) console.error(`  … and ${failures.length - 10} more`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
