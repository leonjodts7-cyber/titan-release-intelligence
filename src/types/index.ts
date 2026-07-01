export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
export type ReleaseStatus = "rumored" | "announced" | "presale" | "on_sale" | "sold_out" | "cancelled" | "ended";
export type ReleaseType = "ticket" | "product" | "merch" | "collectible" | "gaming" | "fashion" | "other";
export type UpdateType =
  | "new_release"
  | "date_changed"
  | "presale_added"
  | "price_changed"
  | "location_changed"
  | "extra_show_added"
  | "official_link_added"
  | "status_changed"
  | "release_imminent"
  | "release_ended"
  | "source_offline"
  | "scan_error"
  | "other";
export type ScanStatus = "pending" | "running" | "completed" | "failed";
export type NotificationChannel = "in_app" | "email" | "discord" | "telegram";
export type SourceType = "api" | "rss" | "html" | "manual" | "mock";

export interface Release {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  brand_id: string | null;
  artist_id: string | null;
  league_id: string | null;
  team_home_id: string | null;
  team_away_id: string | null;
  venue_id: string | null;
  country_id: string | null;
  city_id: string | null;
  release_type: ReleaseType;
  status: ReleaseStatus;
  official_url: string | null;
  source_url: string | null;
  image_url: string | null;
  description: string | null;
  announced_at: string | null;
  presale_starts_at: string | null;
  general_sale_starts_at: string | null;
  release_starts_at: string | null;
  release_ends_at: string | null;
  timezone: string;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  stock_estimate: number | null;
  capacity_estimate: number | null;
  hype_score: number;
  demand_score: number;
  urgency_score: number;
  sellout_probability: number;
  resale_interest_score: number;
  confidence_score: number;
  priority_level: PriorityLevel;
  last_checked_at: string | null;
  last_changed_at: string | null;
  source_adapter_id: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  release_categories?: { name: string; slug: string } | null;
  brands?: { name: string } | null;
  artists?: { name: string } | null;
  sports_leagues?: { name: string } | null;
  countries?: { name: string; code: string } | null;
  cities?: { name: string } | null;
  venues?: { name: string; capacity: number | null } | null;
}

export interface ReleaseUpdate {
  id: string;
  release_id: string;
  update_type: UpdateType;
  old_value: string | null;
  new_value: string | null;
  summary: string | null;
  source_url: string | null;
  detected_at: string;
  importance_score: number;
  notified: boolean;
  created_at: string;
}

export interface ReleaseScore {
  id: string;
  release_id: string;
  hype_score: number;
  demand_score: number;
  urgency_score: number;
  sellout_probability: number;
  resale_interest_score: number;
  confidence_score: number;
  priority_level: PriorityLevel;
  short_summary: string | null;
  recommended_action: string | null;
  risk_notes: string | null;
  model_version: string;
  scored_at: string;
}

export interface SourceAdapter {
  id: string;
  name: string;
  source_type: SourceType;
  base_url: string | null;
  category: string | null;
  enabled: boolean;
  scan_frequency_minutes: number;
  last_scan_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  reliability_score: number;
  api_key_env: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScanJob {
  id: string;
  source_adapter_id: string;
  status: ScanStatus;
  started_at: string | null;
  finished_at: string | null;
  items_found: number;
  items_created: number;
  items_updated: number;
  items_skipped: number;
  error_message: string | null;
  created_at: string;
  source_adapters?: { name: string } | null;
}

export interface Notification {
  id: string;
  user_id: string | null;
  release_id: string | null;
  channel: NotificationChannel;
  status: "pending" | "sent" | "failed" | "read";
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
  releases?: { title: string; slug: string; priority_level: PriorityLevel } | null;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  watchlist_rules?: WatchlistRule[];
}

export interface WatchlistRule {
  id: string;
  watchlist_id: string;
  field: string;
  operator: "equals" | "contains" | "gte" | "lte" | "within_days";
  value: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  release_id: string;
  user_id: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  title: string;
  description: string | null;
  created_at: string;
  releases?: Release | null;
}

export interface AdminNote {
  id: string;
  release_id: string;
  user_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface NormalizedRelease {
  title: string;
  slug?: string;
  category_slug?: string;
  brand_slug?: string;
  artist_slug?: string;
  league_slug?: string;
  release_type: ReleaseType;
  status: ReleaseStatus;
  official_url?: string;
  source_url: string;
  image_url?: string;
  description?: string;
  announced_at?: string;
  presale_starts_at?: string;
  general_sale_starts_at?: string;
  release_starts_at?: string;
  release_ends_at?: string;
  timezone?: string;
  price_min?: number;
  price_max?: number;
  currency?: string;
  stock_estimate?: number;
  capacity_estimate?: number;
  external_id?: string;
  country_code?: string;
  city_name?: string;
  venue_name?: string;
}

export interface AIScoreResult {
  hype_score: number;
  demand_score: number;
  urgency_score: number;
  sellout_probability: number;
  resale_interest_score: number;
  confidence_score: number;
  priority_level: PriorityLevel;
  short_summary: string;
  recommended_action: string;
  risk_notes: string;
}

export interface ReleaseFilters {
  search?: string;
  category?: string;
  brand?: string;
  artist?: string;
  league?: string;
  country?: string;
  city?: string;
  priority?: PriorityLevel;
  status?: ReleaseStatus;
  source?: string;
  sort?: "priority" | "date" | "hype" | "sellout" | "roi";
  limit?: number;
}

export interface SetupHealth {
  demoMode: boolean;
  gitBranch: string;
  gitRemoteConfigured: boolean;
  gitRemoteInstructions: string | null;
  supabaseConnected: boolean;
  serviceRoleAvailable: boolean;
  tablesFound: boolean;
  seedDataFound: boolean;
  openaiConfigured: boolean;
  discordConfigured: boolean;
  telegramConfigured: boolean;
  resendConfigured: boolean;
  cronSecretConfigured: boolean;
  ticketmasterConfigured: boolean;
  rssFeedsConfigured: boolean;
  errors: string[];
}
