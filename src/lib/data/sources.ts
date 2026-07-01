import type { SourceAdapter, ScanJob } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/admin";

const MOCK_SOURCES: SourceAdapter[] = [
  { id: "1", name: "Ticketmaster", source_type: "mock", base_url: "https://www.ticketmaster.com", category: "concert-tickets", enabled: true, scan_frequency_minutes: 30, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 85, api_key_env: "TICKETMASTER_API_KEY", config: {}, created_at: "", updated_at: "" },
  { id: "2", name: "Nike SNKRS", source_type: "mock", base_url: "https://www.nike.com/launch", category: "nike-drops", enabled: true, scan_frequency_minutes: 15, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 90, api_key_env: "NIKE_API_KEY", config: { monitor_urls: ["https://www.nike.com/launch"] }, created_at: "", updated_at: "" },
  { id: "3", name: "Adidas Confirmed", source_type: "mock", base_url: "https://www.adidas.com/confirmed", category: "adidas-drops", enabled: true, scan_frequency_minutes: 15, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 88, api_key_env: "ADIDAS_API_KEY", config: {}, created_at: "", updated_at: "" },
  { id: "4", name: "UEFA", source_type: "mock", base_url: "https://www.uefa.com/tickets", category: "champions-league", enabled: true, scan_frequency_minutes: 60, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 92, api_key_env: null, config: { monitor_urls: ["https://www.uefa.com/tickets"] }, created_at: "", updated_at: "" },
  { id: "5", name: "NFL", source_type: "mock", base_url: "https://www.nfl.com/super-bowl/tickets", category: "super-bowl", enabled: true, scan_frequency_minutes: 60, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 95, api_key_env: null, config: {}, created_at: "", updated_at: "" },
  { id: "6", name: "RSS Feeds", source_type: "rss", base_url: null, category: "all", enabled: true, scan_frequency_minutes: 30, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 70, api_key_env: null, config: {}, created_at: "", updated_at: "" },
  { id: "7", name: "Eventim", source_type: "mock", base_url: "https://www.eventim.de", category: "concert-tickets", enabled: true, scan_frequency_minutes: 15, last_scan_at: null, last_success_at: null, last_error: "Rate limited", reliability_score: 75, api_key_env: null, config: {}, created_at: "", updated_at: "" },
  { id: "8", name: "TCGplayer", source_type: "mock", base_url: "https://www.tcgplayer.com", category: "tcg-collectibles", enabled: true, scan_frequency_minutes: 10, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 88, api_key_env: "TCGPLAYER_API_KEY", config: {}, created_at: "", updated_at: "" },
  { id: "9", name: "Pokémon Center RSS", source_type: "rss", base_url: "https://www.pokemoncenter.com", category: "tcg-collectibles", enabled: true, scan_frequency_minutes: 10, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 85, api_key_env: null, config: {}, created_at: "", updated_at: "" },
  { id: "10", name: "StockX", source_type: "mock", base_url: "https://stockx.com", category: "limited-sneakers", enabled: true, scan_frequency_minutes: 15, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 82, api_key_env: "STOCKX_API_KEY", config: {}, created_at: "", updated_at: "" },
  { id: "11", name: "CardMarket", source_type: "mock", base_url: "https://www.cardmarket.com", category: "tcg-collectibles", enabled: true, scan_frequency_minutes: 15, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 80, api_key_env: "CARDMARKET_API_KEY", config: {}, created_at: "", updated_at: "" },
  { id: "12", name: "JustTCG", source_type: "mock", base_url: "https://justtcg.com", category: "tcg-collectibles", enabled: true, scan_frequency_minutes: 15, last_scan_at: null, last_success_at: null, last_error: null, reliability_score: 78, api_key_env: "JUSTTCG_API_KEY", config: {}, created_at: "", updated_at: "" },
];

export async function getSourceAdapters(enabledOnly = false): Promise<SourceAdapter[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return enabledOnly ? MOCK_SOURCES.filter((s) => s.enabled) : MOCK_SOURCES;

  let query = supabase.from("source_adapters").select("*").order("name");
  if (enabledOnly) query = query.eq("enabled", true);
  const { data, error } = await query;
  if (!error && data?.length) return data as SourceAdapter[];
  return enabledOnly ? MOCK_SOURCES.filter((s) => s.enabled) : MOCK_SOURCES;
}

export async function getScanJobs(limit = 20): Promise<ScanJob[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getMockScanJobs();

  const { data, error } = await supabase
    .from("scan_jobs")
    .select("*, source_adapters(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!error && data?.length) return data as ScanJob[];
  return getMockScanJobs();
}

function getMockScanJobs(): ScanJob[] {
  const now = Date.now();
  return [
    { id: "1", source_adapter_id: "2", status: "completed", started_at: new Date(now - 120000).toISOString(), finished_at: new Date(now - 60000).toISOString(), items_found: 2, items_created: 1, items_updated: 0, items_skipped: 1, error_message: null, created_at: new Date(now - 120000).toISOString(), source_adapters: { name: "Nike SNKRS" } },
    { id: "2", source_adapter_id: "1", status: "completed", started_at: new Date(now - 900000).toISOString(), finished_at: new Date(now - 840000).toISOString(), items_found: 5, items_created: 0, items_updated: 1, items_skipped: 4, error_message: null, created_at: new Date(now - 900000).toISOString(), source_adapters: { name: "Ticketmaster" } },
    { id: "3", source_adapter_id: "7", status: "failed", started_at: new Date(now - 2700000).toISOString(), finished_at: new Date(now - 2690000).toISOString(), items_found: 0, items_created: 0, items_updated: 0, items_skipped: 0, error_message: "Rate limited - retry in 15min", created_at: new Date(now - 2700000).toISOString(), source_adapters: { name: "Eventim" } },
  ];
}

export async function getFailedSources(): Promise<SourceAdapter[]> {
  const sources = await getSourceAdapters();
  return sources.filter((s) => s.last_error && s.enabled);
}
