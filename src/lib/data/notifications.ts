import type { Notification, Watchlist } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/admin";

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    user_id: null,
    release_id: "5",
    channel: "in_app",
    status: "sent",
    title: "[EXTREME] Nike Mercurial Limited Drop",
    body: "Release binnen 24 uur. Hype 88 · Kans op uitverkocht 94%",
    metadata: { priority: "EXTREME", template: "release_24h" },
    sent_at: new Date(Date.now() - 3600000).toISOString(),
    read_at: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "2",
    user_id: null,
    release_id: "2",
    channel: "in_app",
    status: "sent",
    title: "[EXTREME] Taylor Swift — Antwerp",
    body: "Voorverkoop nu actief. Algemene verkoop over 3 dagen.",
    metadata: { priority: "EXTREME", template: "presale_active" },
    sent_at: new Date(Date.now() - 7200000).toISOString(),
    read_at: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "3",
    user_id: null,
    release_id: "7",
    channel: "in_app",
    status: "read",
    title: "[HIGH] Adidas F50 Limited",
    body: "Nieuwe release gedetecteerd via Adidas Confirmed",
    metadata: { priority: "HIGH", template: "new_release" },
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    read_at: new Date(Date.now() - 80000000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "4",
    user_id: null,
    release_id: "1",
    channel: "in_app",
    status: "read",
    title: "Datum gewijzigd: Coldplay Europe Tour",
    body: "Voorverkoopdatum aangekondigd voor Coldplay Europe Tour",
    metadata: { priority: "EXTREME", template: "date_changed" },
    sent_at: new Date(Date.now() - 172800000).toISOString(),
    read_at: new Date(Date.now() - 170000000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const MOCK_WATCHLISTS: Watchlist[] = [
  { id: "1", user_id: "demo", name: "Nike Drops", description: "All Nike product releases", enabled: true, created_at: "", updated_at: "", watchlist_rules: [{ id: "r1", watchlist_id: "1", field: "brand", operator: "equals", value: "Nike", created_at: "" }] },
  { id: "2", user_id: "demo", name: "Champions League", description: "UEFA CL matches and finals", enabled: true, created_at: "", updated_at: "", watchlist_rules: [{ id: "r2", watchlist_id: "2", field: "league", operator: "contains", value: "Champions League", created_at: "" }] },
  { id: "3", user_id: "demo", name: "EXTREME Alerts", description: "Only extreme priority", enabled: true, created_at: "", updated_at: "", watchlist_rules: [{ id: "r3", watchlist_id: "3", field: "priority_level", operator: "equals", value: "EXTREME", created_at: "" }] },
];

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return MOCK_NOTIFICATIONS;

  const { data, error } = await supabase
    .from("notifications")
    .select("*, releases(title, slug, priority_level)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!error && data?.length) return data as Notification[];
  return MOCK_NOTIFICATIONS;
}

export async function getWatchlists(): Promise<Watchlist[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return MOCK_WATCHLISTS;

  const { data, error } = await supabase
    .from("watchlists")
    .select("*, watchlist_rules(*)")
    .eq("enabled", true);

  if (!error && data?.length) {
    return data.map((wl) => ({
      ...wl,
      watchlist_rules: wl.watchlist_rules ?? [],
    })) as Watchlist[];
  }
  return MOCK_WATCHLISTS;
}
