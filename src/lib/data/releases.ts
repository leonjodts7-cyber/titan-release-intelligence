import type { Release, ReleaseFilters } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/admin";
import { generateMockReleases } from "./mock-releases";

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
  const supabase = getSupabaseClient();
  if (!supabase) return filterMockReleases(getMockReleases(), filters);

  let query = supabase.from("releases").select(RELEASE_SELECT);

  if (filters.priority) query = query.eq("priority_level", filters.priority);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("release_categories.slug", filters.category);
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

  query = query.limit(filters.limit ?? 200);

  const { data, error } = await query;
  if (error) {
    console.error("getReleases error:", error.message);
    return filterMockReleases(getMockReleases(), filters);
  }
  return (data as Release[])?.length ? (data as Release[]) : filterMockReleases(getMockReleases(), filters);
}

export async function getReleaseById(id: string): Promise<Release | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return getMockReleases().find((r) => r.id === id) ?? null;

  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    return getMockReleases().find((r) => r.id === id) ?? null;
  }
  return data as Release;
}

export async function getReleaseBySlug(slug: string): Promise<Release | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return getMockReleases().find((r) => r.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("releases")
    .select(RELEASE_SELECT)
    .eq("slug", slug)
    .single();

  if (error) {
    return getMockReleases().find((r) => r.slug === slug) ?? null;
  }
  return data as Release;
}

let _mockCache: Release[] | null = null;

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
