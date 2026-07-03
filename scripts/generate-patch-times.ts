/**
 * Generates supabase/patch_times.sql — realistic drop times + event_date for tickets.
 * Run: npx tsx scripts/generate-patch-times.ts
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateMockReleases } from "../src/lib/data/mock-releases";
import { enrichReleases } from "../src/lib/data/enrich-releases";
import { getDropAt } from "../src/lib/drop";
import { classifyRelease } from "../src/lib/categories/taxonomy";

function sqlStr(v: string | null | undefined): string {
  if (v == null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlTs(v: string | null | undefined): string {
  if (!v) return "NULL";
  return `'${v}'::timestamptz`;
}

function sqlBool(v: boolean): string {
  return v ? "true" : "false";
}

const releases = enrichReleases(generateMockReleases());
const lines: string[] = [
  "-- TITAN v8: snap drop times to realistic slots + event_date for tickets",
  "-- Safe to run multiple times",
  "",
  "ALTER TABLE releases ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;",
  "",
];

for (const r of releases) {
  const at = getDropAt(r);
  const { main, sub } = classifyRelease(r);
  lines.push(
    `UPDATE releases SET drop_at = ${sqlTs(at)}, release_starts_at = ${sqlTs(at)}, drop_time_confirmed = ${sqlBool(Boolean(r.drop_time_confirmed))}, main_category = ${sqlStr(main)}, sub_category = ${sqlStr(sub)}, event_date = ${sqlTs(r.event_date ?? null)} WHERE slug = ${sqlStr(r.slug)};`
  );
}

lines.push("");
lines.push("SELECT slug, drop_at, drop_time_confirmed, event_date FROM releases WHERE release_type = 'ticket' ORDER BY drop_at LIMIT 10;");

const out = lines.join("\n");
const target = resolve(process.cwd(), "supabase/patch_times.sql");
writeFileSync(target, out, "utf8");
console.log(`patch_times.sql: ${releases.length} updates → ${target}`);
