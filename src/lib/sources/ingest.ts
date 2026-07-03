import { getSupabaseClient } from "@/lib/supabase/client-factory";
import type { NormalizedRelease } from "@/types";
import { ticketmasterAdapter } from "./ticketmaster";
import { curatedAdapter } from "./curated";
import type { IngestResult, IngestSummary, SourceAdapter } from "./types";

const ADAPTERS: SourceAdapter[] = [ticketmasterAdapter, curatedAdapter];

let lastIngestAt: string | null = null;

export function getLastIngestAt(): string | null {
  return lastIngestAt;
}

function dedupeKey(r: NormalizedRelease): string {
  const src = r.external_source ?? "unknown";
  const id = r.external_source_id ?? r.slug ?? r.title;
  return `${src}|${id}`;
}

export function dedupeIngestReleases(items: NormalizedRelease[]): NormalizedRelease[] {
  const seen = new Set<string>();
  const out: NormalizedRelease[] = [];
  for (const r of items) {
    const key = dedupeKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function upsertRelease(item: NormalizedRelease): Promise<"created" | "updated" | "skipped"> {
  const supabase = getSupabaseClient();
  if (!supabase) return "skipped";

  const row = {
    title: item.title,
    slug: item.slug ?? item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    release_type: item.release_type,
    status: item.status,
    official_url: item.official_url ?? null,
    source_url: item.source_url,
    description: item.description ?? null,
    release_starts_at: item.drop_at ?? item.release_starts_at ?? null,
    drop_at: item.drop_at ?? item.release_starts_at ?? null,
    drop_time_confirmed: item.drop_time_confirmed ?? false,
    drop_timezone: item.drop_timezone ?? "Europe/Brussels",
    drop_event_type: item.drop_event_type ?? null,
    presale_starts_at: item.presale_starts_at ?? null,
    general_sale_starts_at: item.general_sale_starts_at ?? null,
    event_date: item.event_date ?? null,
    main_category: item.main_category ?? null,
    sub_category: item.sub_category ?? null,
    data_origin: item.data_origin ?? "api",
    price_min: item.price_min ?? null,
    price_max: item.price_max ?? null,
    currency: item.currency ?? "EUR",
    buy_locations: item.buy_locations ?? [],
    hype_reason: item.hype_reason ?? null,
    sale_type: item.sale_type ?? "drop",
    source_name: item.source_name ?? null,
    source_checked_at: item.source_checked_at ?? new Date().toISOString(),
    external_source: item.external_source ?? null,
    external_source_id: item.external_source_id ?? item.external_id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (item.external_source && item.external_source_id) {
    const { data: existing } = await supabase
      .from("releases")
      .select("id")
      .eq("external_source", item.external_source)
      .eq("external_source_id", item.external_source_id)
      .maybeSingle();

    if (existing) {
      await supabase.from("releases").update(row).eq("id", existing.id);
      return "updated";
    }
  }

  const { error } = await supabase.from("releases").insert(row);
  if (error) {
    console.warn("[ingest] insert failed:", error.message);
    return "skipped";
  }
  return "created";
}

async function writeScanLog(result: IngestResult): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const message = result.errors.length
    ? `[${result.source}] mislukt: ${result.errors.join("; ")}`
    : `[${result.source}] ${result.found} gevonden, ${result.created} nieuw, ${result.updated} bijgewerkt`;
  try {
    await supabase.from("scan_logs").insert({
      level: result.errors.length ? "error" : "info",
      message,
      metadata: {
        source: result.source,
        found: result.found,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
      },
    });
  } catch {
    // ignore log persistence errors
  }
}

export async function runIngest(): Promise<IngestSummary> {
  const results: IngestResult[] = [];

  for (const adapter of ADAPTERS) {
    const result: IngestResult = {
      source: adapter.name,
      found: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const raw = await adapter.fetchReleases();
      const items = dedupeIngestReleases(raw);
      result.found = items.length;

      for (const item of items) {
        const status = await upsertRelease(item);
        if (status === "created") result.created++;
        else if (status === "updated") result.updated++;
        else result.skipped++;
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : "Onbekende fout");
    }

    await writeScanLog(result);
    results.push(result);
  }

  lastIngestAt = new Date().toISOString();
  return { results, lastIngestAt };
}

export async function rolloverPastDrops(): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  const { data } = await supabase
    .from("releases")
    .select("id, drop_at, release_starts_at, status")
    .neq("status", "ended")
    .in("data_origin", ["api", "curated"]);

  let count = 0;
  for (const r of data ?? []) {
    const at = r.drop_at ?? r.release_starts_at;
    if (at && new Date(at).getTime() < Date.now()) {
      await supabase.from("releases").update({ status: "ended" }).eq("id", r.id);
      count++;
    }
  }
  return count;
}
