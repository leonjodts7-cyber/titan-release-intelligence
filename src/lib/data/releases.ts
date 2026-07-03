import type { Release, ReleaseFilters } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";
import { generateMockReleases } from "./mock-releases";
import { applyDefaultDropFilters } from "@/lib/drops/filter";
import { classifySupabaseError, setDataModeState, type DataModeReason } from "@/lib/data/mode";

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

function mockFallback(filters: ReleaseFilters, reason: DataModeReason, message?: string): Release[] {
  if (reason === "live") reason = "query_error";
  setDataModeState({ mode: "demo", reason, message });
  return applyDefaultDropFilters(filterMockReleases(getMockReleases(), filters), {
    includePast: filters.includePast,
  });
}

export async function getReleases(filters: ReleaseFilters = {}): Promise<Release[]> {
  if (!isSupabaseConfigured()) {
    return mockFallback(filters, "not_configured");
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return mockFallback(filters, "not_configured");
  }

  let query = supabase.from("releases").select(RELEASE_SELECT);

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
    return mockFallback(filters, reason, error.message);
  }

  const rows = data as Release[];
  if (!rows?.length) {
    return mockFallback(filters, "empty");
  }

  setDataModeState({ mode: "live", reason: "live" });
  return applyDefaultDropFilters(filterMockReleases(rows, filters), {
    includePast: filters.includePast,
  });
}

export async function getReleaseById(id: string): Promise<Release | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setDataModeState({ mode: "demo", reason: "not_configured" });
    return getMockReleases().find((r) => r.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    const reason = classifySupabaseError(error.message);
    setDataModeState({ mode: "demo", reason, message: error.message });
    return getMockReleases().find((r) => r.id === id) ?? null;
  }

  setDataModeState({ mode: "live", reason: "live" });
  return data as Release;
}

export async function getReleaseBySlug(slug: string): Promise<Release | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setDataModeState({ mode: "demo", reason: "not_configured" });
    return getMockReleases().find((r) => r.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("slug", slug)
    .single();

  if (error) {
    const reason = classifySupabaseError(error.message);
    setDataModeState({ mode: "demo", reason, message: error.message });
    return getMockReleases().find((r) => r.slug === slug) ?? null;
  }

  setDataModeState({ mode: "live", reason: "live" });
  return data as Release;
}

let _mockCache: Release[] | null = null;

export function invalidateMockCache(): void {
  _mockCache = null;
}

export function getMockReleases(): Release[] {
  if (!_mockCache) _mockCache = generateMockReleases();
  return _mockCache;
}

function filterMockReleases(releases: Release[], filters: ReleaseFilters): Release[] {
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

export async function countLiveReleases(): Promise<number | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { count, error } = await supabase.from("releases").select("id", { count: "exact", head: true });
  if (error) return null;
  return count ?? 0;
}
