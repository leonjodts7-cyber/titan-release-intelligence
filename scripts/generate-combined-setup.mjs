#!/usr/bin/env node
/**
 * Generates supabase/combined_setup.sql from migrations (000, 002..latest).
 * Skips 001_schema.sql (overlaps with 000).
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migDir = join(root, "supabase/migrations");

const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const ordered = files.filter((f) => {
  if (f === "001_schema.sql") return false;
  const n = parseInt(f.split("_")[0], 10);
  return n === 0 || n >= 2;
});

function header(name) {
  const bar = "=".repeat(Math.max(name.length + 4, 40));
  return `\n-- ${bar}\n-- ===== ${name} =====\n-- ${bar}\n\n`;
}

function makePoliciesIdempotent(sql) {
  return sql.replace(/CREATE POLICY "([^"]+)" ON (\w+)/g, (_m, policy, table) => {
    return `DROP POLICY IF EXISTS "${policy}" ON ${table};\nCREATE POLICY "${policy}" ON ${table}`;
  });
}

function patchSeed003(sql) {
  let out = sql;

  // cities: no unique constraint in base schema — add index + conflict target
  out = out.replace(
    /INSERT INTO cities \(name, country_id\) VALUES/,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_name_country ON cities(name, country_id);\n\nINSERT INTO cities (name, country_id) VALUES`
  );
  out = out.replace(
    /ON CONFLICT DO NOTHING;\n\n-- Venues/,
    `ON CONFLICT (name, country_id) DO NOTHING;\n\n-- Venues`
  );

  // release_updates: avoid duplicate seed rows
  out = out.replace(
    /-- Sample release updates\nINSERT INTO release_updates/,
    `-- Sample release updates
INSERT INTO release_updates (release_id, update_type, old_value, new_value, summary, importance_score)
SELECT v.release_id, v.update_type, v.old_value, v.new_value, v.summary, v.importance_score
FROM (VALUES
  (
    (SELECT id FROM releases WHERE slug = 'coldplay-europe-tour-2026'),
    'presale_added'::update_type, NULL::TEXT, (NOW() + INTERVAL '2 days')::TEXT,
    'Presale date announced for Coldplay Europe Tour', 85::NUMERIC
  ),
  (
    (SELECT id FROM releases WHERE slug = 'taylor-swift-stadium-show-london'),
    'date_changed'::update_type, '2026-08-15', '2026-08-22',
    'London show date moved by one week', 90::NUMERIC
  ),
  (
    (SELECT id FROM releases WHERE slug = 'nike-mercurial-limited-drop'),
    'official_link_added'::update_type, NULL::TEXT, 'https://www.nike.com/launch/t/mercurial-limited',
    'Official SNKRS product page now live', 75::NUMERIC
  )
) AS v(release_id, update_type, old_value, new_value, summary, importance_score)
WHERE v.release_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM release_updates ru
    WHERE ru.release_id = v.release_id AND ru.summary = v.summary
  );

-- (original release_updates block replaced for idempotency)
-- INSERT INTO release_updates`
  );

  // Remove old release_updates INSERT block through semicolon before release_scores
  out = out.replace(
    /-- \(original release_updates block replaced for idempotency\)\n-- INSERT INTO release_updates[\s\S]*?;\n\n-- Sample release scores/,
    `-- Sample release scores`
  );

  // release_scores: idempotent insert
  out = out.replace(
    /-- Sample release scores\nINSERT INTO release_scores[\s\S]*?\);(\s*\n)/,
    `-- Sample release scores
INSERT INTO release_scores (release_id, hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score, priority_level, short_summary, recommended_action, risk_notes)
SELECT v.release_id, v.hype_score, v.demand_score, v.urgency_score, v.sellout_probability, v.resale_interest_score, v.confidence_score, v.priority_level, v.short_summary, v.recommended_action, v.risk_notes
FROM (VALUES
  (
    (SELECT id FROM releases WHERE slug = 'coldplay-europe-tour-2026'),
    92::NUMERIC, 95::NUMERIC, 78::NUMERIC, 98::NUMERIC, 90::NUMERIC, 88::NUMERIC, 'EXTREME'::priority_level,
    'Global superstar stadium tour with extreme demand expected',
    'Register for presale, prepare multiple devices, check fan club access',
    'High bot activity expected on Ticketmaster'
  ),
  (
    (SELECT id FROM releases WHERE slug = 'super-bowl-lx'),
    99::NUMERIC, 99::NUMERIC, 40::NUMERIC, 99::NUMERIC, 98::NUMERIC, 95::NUMERIC, 'EXTREME'::priority_level,
    'Most demanded sporting event globally - lottery only',
    'Enter NFL lottery immediately, monitor official resale portal',
    'Scam sites common - only use nfl.com'
  )
) AS v(release_id, hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score, priority_level, short_summary, recommended_action, risk_notes)
WHERE v.release_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM release_scores rs
    WHERE rs.release_id = v.release_id AND rs.short_summary = v.short_summary
  );
$1`
  );

  return out;
}

const verification = `
-- ${"=".repeat(60)}
-- ===== VERIFICATION: row counts per core table =====
-- ${"=".repeat(60)}

SELECT table_name, row_count
FROM (
  SELECT 'users_profile' AS table_name, COUNT(*)::bigint AS row_count FROM users_profile
  UNION ALL SELECT 'countries', COUNT(*) FROM countries
  UNION ALL SELECT 'cities', COUNT(*) FROM cities
  UNION ALL SELECT 'release_categories', COUNT(*) FROM release_categories
  UNION ALL SELECT 'brands', COUNT(*) FROM brands
  UNION ALL SELECT 'artists', COUNT(*) FROM artists
  UNION ALL SELECT 'sports_leagues', COUNT(*) FROM sports_leagues
  UNION ALL SELECT 'venues', COUNT(*) FROM venues
  UNION ALL SELECT 'source_adapters', COUNT(*) FROM source_adapters
  UNION ALL SELECT 'releases', COUNT(*) FROM releases
  UNION ALL SELECT 'release_updates', COUNT(*) FROM release_updates
  UNION ALL SELECT 'release_scores', COUNT(*) FROM release_scores
  UNION ALL SELECT 'watchlists', COUNT(*) FROM watchlists
  UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
  UNION ALL SELECT 'scan_jobs', COUNT(*) FROM scan_jobs
  UNION ALL SELECT 'scan_logs', COUNT(*) FROM scan_logs
  UNION ALL SELECT 'alert_rules', COUNT(*) FROM alert_rules
  UNION ALL SELECT 'alert_events', COUNT(*) FROM alert_events
  UNION ALL SELECT 'fx_rates', COUNT(*) FROM fx_rates
  UNION ALL SELECT 'fee_profiles', COUNT(*) FROM fee_profiles
  UNION ALL SELECT 'alert_channels', COUNT(*) FROM alert_channels
  UNION ALL SELECT 'alert_deliveries', COUNT(*) FROM alert_deliveries
  UNION ALL SELECT 'positions', COUNT(*) FROM positions
  UNION ALL SELECT 'prediction_snapshots', COUNT(*) FROM prediction_snapshots
) counts
ORDER BY table_name;
`;

let combined = `-- TITAN Release Intelligence — Combined setup script
-- Generated from migrations: ${ordered.join(", ")}
-- Skipped: 001_schema.sql (overlaps with 000_base_schema.sql)
--
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.
--
-- Generated: ${new Date().toISOString().slice(0, 10)}
`;

for (const file of ordered) {
  let sql = readFileSync(join(migDir, file), "utf8");
  if (file === "002_rls.sql") {
    sql = makePoliciesIdempotent(sql);
  }
  if (file === "003_seed.sql") {
    sql = patchSeed003(sql);
  }
  combined += header(file) + sql.trim() + "\n";
}

combined += verification;

const outPath = join(root, "supabase/combined_setup.sql");
writeFileSync(outPath, combined, "utf8");
console.log(`Wrote ${outPath} (${combined.split("\n").length} lines) from ${ordered.length} migrations`);
