/**
 * Generates supabase/patch_categories.sql for existing databases.
 * Run: npx tsx scripts/generate-patch-categories.ts
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateMockReleases } from "../src/lib/data/mock-releases";
import { enrichReleases } from "../src/lib/data/enrich-releases";
import { classifyRelease } from "../src/lib/categories/taxonomy";

function sqlStr(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

const releases = enrichReleases(generateMockReleases());
const lines: string[] = [
  "-- TITAN v7: patch main_category + sub_category on existing releases",
  "-- Safe to run multiple times on an existing database",
  "",
  "ALTER TABLE releases ADD COLUMN IF NOT EXISTS main_category TEXT;",
  "ALTER TABLE releases ADD COLUMN IF NOT EXISTS sub_category TEXT;",
  "",
];

for (const r of releases) {
  const { main, sub } = classifyRelease(r);
  lines.push(
    `UPDATE releases SET main_category = ${sqlStr(main)}, sub_category = ${sqlStr(sub)} WHERE slug = ${sqlStr(r.slug)};`
  );
}

lines.push("");
lines.push("-- Verify");
lines.push("SELECT main_category, sub_category, COUNT(*) FROM releases GROUP BY 1, 2 ORDER BY 1, 2;");

const out = lines.join("\n");
const target = resolve(process.cwd(), "supabase/patch_categories.sql");
writeFileSync(target, out, "utf8");
console.log(`patch_categories.sql: ${releases.length} updates → ${target}`);
