/**
 * Emits idempotent SQL seed from generateMockReleases() + enrichReleases().
 * Used by scripts/generate-combined-setup.mjs
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateMockReleases } from "../src/lib/data/mock-releases";
import { enrichReleases } from "../src/lib/data/enrich-releases";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sqlStr(v: string | null | undefined): string {
  if (v == null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "NULL";
  return String(v);
}

function sqlBool(v: boolean | null | undefined): string {
  if (v == null) return "NULL";
  return v ? "true" : "false";
}

function sqlTs(v: string | null | undefined): string {
  if (!v) return "NULL";
  return `'${v}'::timestamptz`;
}

function sqlJson(v: unknown): string {
  return `'${JSON.stringify(v ?? []).replace(/'/g, "''")}'::jsonb`;
}

const CATEGORY_ICONS: Record<string, string> = {
  "concert-tickets": "music",
  "sport-tickets": "trophy",
  "football-matches": "football",
  "super-bowl": "football",
  "champions-league": "trophy",
  "premier-league": "football",
  festivals: "festival",
  "nike-drops": "shoe",
  "limited-sneakers": "shoe",
  "fashion-drops": "shirt",
  gaming: "gamepad",
  "gaming-drops": "gamepad",
  "tcg-collectibles": "box",
  collectibles: "box",
  "world-cup": "trophy",
  "adidas-drops": "shoe",
};

function main(): void {
  const releases = enrichReleases(generateMockReleases());
  const lines: string[] = [];

  lines.push(`-- Full mock seed: ${releases.length} releases (idempotent)`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);

  const categories = new Map<string, string>();
  const brands = new Map<string, string>();
  const artists = new Map<string, string>();
  const leagues = new Map<string, string>();
  const countries = new Map<string, { name: string; code: string }>();
  const cities = new Map<string, { name: string; code: string }>();
  const venues = new Map<string, { name: string; city: string; capacity: number | null }>();

  for (const r of releases) {
    if (r.release_categories) categories.set(r.release_categories.slug, r.release_categories.name);
    if (r.brands?.name) brands.set(slugify(r.brands.name), r.brands.name);
    if (r.artists?.name) artists.set(slugify(r.artists.name), r.artists.name);
    if (r.sports_leagues?.name) leagues.set(slugify(r.sports_leagues.name), r.sports_leagues.name);
    if (r.countries?.code) countries.set(r.countries.code, { name: r.countries.name, code: r.countries.code });
    if (r.cities?.name && r.countries?.code) {
      cities.set(`${r.cities.name}|${r.countries.code}`, { name: r.cities.name, code: r.countries.code });
    }
    if (r.venues?.name && r.cities?.name) {
      venues.set(slugify(r.venues.name), {
        name: r.venues.name,
        city: r.cities.name,
        capacity: r.venues.capacity,
      });
    }
  }

  lines.push("\n-- Reference: categories");
  for (const [slug, name] of categories) {
    const icon = CATEGORY_ICONS[slug] ?? "box";
    lines.push(
      `INSERT INTO release_categories (name, slug, icon) VALUES (${sqlStr(name)}, ${sqlStr(slug)}, ${sqlStr(icon)}) ON CONFLICT (slug) DO NOTHING;`
    );
  }

  lines.push("\n-- Reference: brands");
  for (const [slug, name] of brands) {
    lines.push(
      `INSERT INTO brands (name, slug) VALUES (${sqlStr(name)}, ${sqlStr(slug)}) ON CONFLICT (slug) DO NOTHING;`
    );
  }

  lines.push("\n-- Reference: artists");
  for (const [slug, name] of artists) {
    lines.push(
      `INSERT INTO artists (name, slug) VALUES (${sqlStr(name)}, ${sqlStr(slug)}) ON CONFLICT (slug) DO NOTHING;`
    );
  }

  lines.push("\n-- Reference: leagues");
  for (const [slug, name] of leagues) {
    lines.push(
      `INSERT INTO sports_leagues (name, slug, sport) VALUES (${sqlStr(name)}, ${sqlStr(slug)}, 'sport') ON CONFLICT (slug) DO NOTHING;`
    );
  }

  lines.push("\n-- Reference: countries");
  for (const { name, code } of countries.values()) {
    lines.push(
      `INSERT INTO countries (name, code) VALUES (${sqlStr(name)}, ${sqlStr(code)}) ON CONFLICT (code) DO NOTHING;`
    );
  }

  lines.push("\nCREATE UNIQUE INDEX IF NOT EXISTS idx_cities_name_country ON cities(name, country_id);");
  lines.push("\n-- Reference: cities");
  for (const { name, code } of cities.values()) {
    lines.push(
      `INSERT INTO cities (name, country_id) SELECT ${sqlStr(name)}, id FROM countries WHERE code = ${sqlStr(code)} ON CONFLICT (name, country_id) DO NOTHING;`
    );
  }

  lines.push("\n-- Reference: venues");
  for (const [slug, v] of venues) {
    lines.push(
      `INSERT INTO venues (name, slug, city_id, capacity) SELECT ${sqlStr(v.name)}, ${sqlStr(slug)}, c.id, ${sqlNum(v.capacity)} FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = ${sqlStr(v.city)} LIMIT 1 ON CONFLICT (slug) DO NOTHING;`
    );
  }

  lines.push(`
INSERT INTO source_adapters (name, source_type, base_url, category, enabled, scan_frequency_minutes, reliability_score)
VALUES ('TITAN Mock Seed', 'mock', NULL, 'all', true, 30, 100)
ON CONFLICT (name) DO NOTHING;
`);

  lines.push(`
INSERT INTO fx_rates (currency, rate_to_eur) VALUES
  ('EUR', 1), ('USD', 0.92), ('GBP', 1.17), ('CAD', 0.68), ('CHF', 1.05), ('AUD', 0.61)
ON CONFLICT (currency) DO NOTHING;

INSERT INTO fee_profiles (platform, seller_fee_pct, payment_fee_pct, shipping_flat_eur) VALUES
  ('stockx', 9.5, 3, 15),
  ('goat', 9.5, 2.9, 14),
  ('ebay', 12, 3.5, 8),
  ('stubhub', 15, 0, 0),
  ('ticketmaster_resale', 10, 0, 0),
  ('tcgplayer', 10.25, 2.5, 4),
  ('direct', 0, 2.5, 6)
ON CONFLICT (platform) DO NOTHING;
`);

  lines.push(`
INSERT INTO alert_rules (name, enabled, rule_type, threshold, channels, cooldown_minutes)
SELECT 'TOP tier alert', true, 'opportunity_score', 90, '["in_app","email"]'::jsonb, 60
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE name = 'TOP tier alert');

INSERT INTO alert_rules (name, enabled, rule_type, threshold, channels, cooldown_minutes)
SELECT 'Release binnen 24u', true, 'hours_until_drop', 24, '["in_app"]'::jsonb, 120
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE name = 'Release binnen 24u');

INSERT INTO alert_rules (name, enabled, rule_type, threshold, channels, cooldown_minutes)
SELECT 'Nieuwe extreme drop', true, 'priority_level', NULL, '["in_app"]'::jsonb, 30
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE name = 'Nieuwe extreme drop');
`);

  lines.push("\n-- Releases (enriched mock data)");
  for (const r of releases) {
    const catSlug = r.release_categories?.slug ?? "other";
    const brandSlug = r.brands?.name ? slugify(r.brands.name) : null;
    const artistSlug = r.artists?.name ? slugify(r.artists.name) : null;
    const leagueSlug = r.sports_leagues?.name ? slugify(r.sports_leagues.name) : null;
    const countryCode = r.countries?.code ?? null;
    const cityName = r.cities?.name ?? null;
    const venueSlug = r.venues?.name ? slugify(r.venues.name) : null;

    lines.push(`
INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  ${sqlStr(r.title)}, ${sqlStr(r.slug)},
  (SELECT id FROM release_categories WHERE slug = ${sqlStr(catSlug)}),
  ${brandSlug ? `(SELECT id FROM brands WHERE slug = ${sqlStr(brandSlug)})` : "NULL"},
  ${artistSlug ? `(SELECT id FROM artists WHERE slug = ${sqlStr(artistSlug)})` : "NULL"},
  ${leagueSlug ? `(SELECT id FROM sports_leagues WHERE slug = ${sqlStr(leagueSlug)})` : "NULL"},
  ${venueSlug ? `(SELECT id FROM venues WHERE slug = ${sqlStr(venueSlug)})` : "NULL"},
  ${countryCode ? `(SELECT id FROM countries WHERE code = ${sqlStr(countryCode)})` : "NULL"},
  ${cityName && countryCode ? `(SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = ${sqlStr(cityName)} AND co.code = ${sqlStr(countryCode)} LIMIT 1)` : "NULL"},
  ${sqlStr(r.release_type)}::release_type, ${sqlStr(r.status)}::release_status,
  ${sqlStr(r.official_url)}, ${sqlStr(r.source_url)}, ${sqlStr(r.description)},
  ${sqlTs(r.announced_at)}, ${sqlTs(r.presale_starts_at)}, ${sqlTs(r.general_sale_starts_at)}, ${sqlTs(r.release_starts_at)},
  ${sqlTs(r.drop_at ?? r.release_starts_at)}, ${sqlBool(r.drop_time_confirmed ?? false)}, ${sqlStr(r.drop_timezone ?? "Europe/Brussels")}, ${sqlStr(r.drop_event_type ?? "release")},
  ${sqlNum(r.price_min)}, ${sqlNum(r.price_max)}, ${sqlStr(r.currency)}, ${sqlNum(r.stock_estimate)}, ${sqlNum(r.capacity_estimate)},
  ${sqlNum(r.hype_score)}, ${sqlNum(r.demand_score)}, ${sqlNum(r.urgency_score)}, ${sqlNum(r.sellout_probability)}, ${sqlNum(r.resale_interest_score)}, ${sqlNum(r.confidence_score)},
  ${sqlStr(r.priority_level)}::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  ${sqlStr(r.tcg_name)}, ${sqlStr(r.set_name)}, ${sqlStr(r.product_type_tcg)}, ${sqlStr(r.card_rarity)}, ${sqlBool(r.sealed_product)},
  ${sqlNum(r.msrp)}, ${sqlNum(r.market_price)},
  ${sqlNum(r.estimated_resale_low)}, ${sqlNum(r.estimated_resale_mid)}, ${sqlNum(r.estimated_resale_high)},
  ${sqlNum(r.expected_profit_low)}, ${sqlNum(r.expected_profit_mid)}, ${sqlNum(r.expected_profit_high)},
  ${sqlNum(r.expected_roi_low)}, ${sqlNum(r.expected_roi_mid)}, ${sqlNum(r.expected_roi_high)},
  ${sqlNum(r.resale_confidence_score)}, ${sqlNum(r.market_liquidity_score)}, ${sqlNum(r.demand_pressure_score)},
  ${sqlStr(r.resale_risk_level)}, ${sqlStr(r.resale_explanation)},
  ${sqlNum(r.opportunity_score)}, ${sqlNum(r.scarcity_score)}, ${sqlNum(r.resale_potential)}, ${sqlNum(r.risk_score)}, ${sqlNum(r.action_urgency)}, ${sqlStr(r.opportunity_action)},
  ${sqlNum(r.popularity_score ?? r.hype_score)}, ${sqlNum(r.momentum_score)}, ${sqlNum(r.volatility_score)},
  ${sqlJson(r.buy_locations ?? [])}, ${sqlStr(r.hype_reason)}, ${sqlStr(r.sale_type ?? "drop")}, ${sqlStr(r.source_name ?? "TITAN Mock")}, ${sqlTs(r.source_checked_at ?? new Date().toISOString())}
ON CONFLICT (slug) DO NOTHING;`);
  }

  const out = lines.join("\n");
  const target = process.argv[2] ?? resolve(process.cwd(), "supabase/.mock-seed.sql");
  writeFileSync(target, out, "utf8");
  console.error(`Mock seed SQL: ${releases.length} releases → ${target}`);
  if (!process.argv[2]) process.stdout.write(out);
}

main();
