#!/usr/bin/env node
/**
 * Generates supabase/combined_setup.sql from migrations + full mock seed.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

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

  out = out.replace(
    /INSERT INTO cities \(name, country_id\) VALUES/,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_name_country ON cities(name, country_id);\n\nINSERT INTO cities (name, country_id) VALUES`
  );
  out = out.replace(
    /ON CONFLICT DO NOTHING;\n\n-- Venues/,
    `ON CONFLICT (name, country_id) DO NOTHING;\n\n-- Venues`
  );

  // Remove legacy sample releases — full mock seed appended at end
  out = out.replace(
    /-- Sample Releases[\s\S]*?ON CONFLICT \(slug\) DO NOTHING;\n\n/,
    "-- Sample releases: see full_mock_seed section at end of file\n\n"
  );

  out = out.replace(
    /-- Sample release updates[\s\S]*?WHERE ru\.release_id = v\.release_id AND ru\.summary = v\.summary\n  \);\n\n/,
    ""
  );

  out = out.replace(
    /-- Sample release scores[\s\S]*?WHERE rs\.release_id = v\.release_id AND rs\.short_summary = v\.short_summary\n  \);\n?/,
    ""
  );

  // Fallback if patch above didn't match (unpatched 003)
  out = out.replace(
    /-- Sample Releases[\s\S]*?ON CONFLICT \(slug\) DO NOTHING;\n\n-- Sample release updates[\s\S]*?\);\n\n-- Sample release scores[\s\S]*?\);\n?/,
    "-- Sample releases: see full_mock_seed section at end of file\n\n"
  );

  return out;
}

function validateSql(sql) {
  const errors = [];
  const dollarBlocks = (sql.match(/\$\$/g) || []).length;
  if (dollarBlocks % 2 !== 0) errors.push("Unbalanced $$ blocks");

  let depth = 0;
  for (const ch of sql) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) errors.push("Unbalanced parentheses");
  }
  if (depth !== 0) errors.push(`Unclosed parentheses (depth ${depth})`);

  if (!sql.includes("CREATE TABLE IF NOT EXISTS releases")) {
    errors.push("Missing releases table definition");
  }
  if (!sql.includes("VERIFICATION")) {
    errors.push("Missing verification query");
  }

  return errors;
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
-- Includes: full mock seed (${new Date().toISOString().slice(0, 10)})
--
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Safe to re-run: IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.
`;

for (const file of ordered) {
  let sql = readFileSync(join(migDir, file), "utf8");
  if (file === "002_rls.sql") sql = makePoliciesIdempotent(sql);
  if (file === "003_seed.sql") sql = patchSeed003(sql);
  combined += header(file) + sql.trim() + "\n";
}

// Append full mock seed
const mockSeedPath = join(root, "supabase/.mock-seed.sql");
execSync(`npx tsx scripts/generate-mock-seed-sql.ts "${mockSeedPath}"`, {
  cwd: root,
  stdio: "inherit",
});
if (existsSync(mockSeedPath)) {
  combined += header("full_mock_seed.sql") + readFileSync(mockSeedPath, "utf8").trim() + "\n";
}

combined += verification;

const validationErrors = validateSql(combined);
if (validationErrors.length) {
  console.error("SQL validation failed:", validationErrors.join("; "));
  process.exit(1);
}

const outPath = join(root, "supabase/combined_setup.sql");
writeFileSync(outPath, combined, "utf8");
console.log(`Wrote ${outPath} (${combined.split("\n").length} lines)`);
