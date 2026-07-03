import type { Release, ReleaseFilters } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";
import { generateMockReleases } from "./mock-releases";
import { applyDefaultDropFilters } from "@/lib/drops/filter";
import { classifySupabaseError, setDataModeState, type DataModeReason } from "@/lib/data/mode";
import { filterVerifiedReleases, isVerifiedRelease } from "@/lib/data/origin";

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

function demoMockReleases(filters: ReleaseFilters, reason: DataModeReason, message?: string): Release[] {
  setDataModeState({ mode: "demo", reason, message });
  const mock = generateMockReleases().map((r) => ({ ...r, data_origin: "mock" as const }));
  return applyDefaultDropFilters(filterLocalReleases(mock, filters), {
    includePast: filters.includePast,
  });
}

function filterLocalReleases(releases: Release[], filters: ReleaseFilters): Release[] {
  let filtered = [...releases];
  if (filters.priority) filtered = filtered.filter((r) => r.priority_level === filters.priority);
  if (filters.category) filtered = filtered.filter((r) => r.release_categories?.slug === filters.category);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((r) => r.title.toLowerCase().includes(q));
  }
  if (filters.limit) filtered = filtered.slice(0, filters.limit);
  return filtered;
}

export async function getReleases(filters: ReleaseFilters = {}): Promise<Release[]> {
  if (!isSupabaseConfigured()) {
    return demoMockReleases(filters, "not_configured");
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return demoMockReleases(filters, "not_configured");
  }

  let query = supabase.from("releases").select(RELEASE_SELECT).in("data_origin", ["api", "curated"]);

  if (filters.priority) query = query.eq("priority_level", filters.priority);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("release_categories.slug", filters.category);
  if (filters.search) {
    query = query.textSearch("search_vector", filters.search, { type: "websearch" });
  }

  switch (filters.sort) {
    case "date":
      query = query.order("drop_at", { ascending: true, nullsFirst: false });
      break;
    case "hype":
      query = query.order("hype_score", { ascending: false });
      break;
    case "sellout":
      query = query.order("sellout_probability", { ascending: false });
      break;
    default:
      query = query.order("drop_at", { ascending: true, nullsFirst: false });
  }

  query = query.limit(filters.limit ?? 200);

  const { data, error } = await query;
  if (error) {
    const reason = classifySupabaseError(error.message);
    if (reason === "schema_missing") {
      return demoMockReleases(filters, reason, error.message);
    }
    setDataModeState({ mode: "live", reason: "query_error", message: error.message });
    return [];
  }

  const rows = filterVerifiedReleases((data as Release[]) ?? []);
  setDataModeState({ mode: "live", reason: "live" });
  return applyDefaultDropFilters(filterLocalReleases(rows, filters), {
    includePast: filters.includePast,
  });
}

export async function getReleaseById(id: string): Promise<Release | null> {
  if (!isSupabaseConfigured()) {
    setDataModeState({ mode: "demo", reason: "not_configured" });
    return generateMockReleases().find((r) => r.id === id) ?? null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    setDataModeState({ mode: "demo", reason: "not_configured" });
    return null;
  }

  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const reason = classifySupabaseError(error.message);
    if (reason === "schema_missing") {
      setDataModeState({ mode: "demo", reason, message: error.message });
      return generateMockReleases().find((r) => r.id === id) ?? null;
    }
    setDataModeState({ mode: "live", reason: "query_error", message: error.message });
    return null;
  }

  if (!data || !isVerifiedRelease(data as Release)) {
    setDataModeState({ mode: "live", reason: "live" });
    return null;
  }

  setDataModeState({ mode: "live", reason: "live" });
  return data as Release;
}

export async function getReleaseBySlug(slug: string): Promise<Release | null> {
  if (!isSupabaseConfigured()) {
    setDataModeState({ mode: "demo", reason: "not_configured" });
    return generateMockReleases().find((r) => r.slug === slug) ?? null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data || !isVerifiedRelease(data as Release)) return null;
  setDataModeState({ mode: "live", reason: "live" });
  return data as Release;
}

export function getMockReleases(): Release[] {
  return generateMockReleases().map((r) => ({ ...r, data_origin: "mock" as const }));
}

/** No-op in v9 — demo mocks are stateless per request. */
export function invalidateMockCache(): void {}

export async function countVerifiedReleases(): Promise<number | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { count, error } = await supabase
    .from("releases")
    .select("id", { count: "exact", head: true })
    .in("data_origin", ["api", "curated"]);
  if (error) return null;
  return count ?? 0;
}

/** @deprecated use countVerifiedReleases */
export async function countLiveReleases(): Promise<number | null> {
  return countVerifiedReleases();
}
