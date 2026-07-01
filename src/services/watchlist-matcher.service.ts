import type { Release } from "@/types";
import { watchlistService } from "./watchlist.service";
import { notificationService } from "./notification.service";
import { createServiceClient, createAnonServiceClient } from "@/lib/supabase/admin";
import type { WatchlistRule } from "@/types";

function getClient() {
  try {
    return createServiceClient();
  } catch {
    return createAnonServiceClient();
  }
}

// In-memory dedup when DB unavailable
const notifiedKeys = new Set<string>();

export class WatchlistMatcherService {
  async processRelease(release: Release, eventType: "new_release" | "update"): Promise<number> {
    const watchlists = await this.loadWatchlists();
    let notificationsCreated = 0;

    for (const wl of watchlists) {
      if (!wl.enabled || !wl.rules?.length) continue;

      if (!watchlistService.matchRelease(release, wl.rules)) continue;

      const dedupKey = `${wl.id}:${release.id}:${eventType}`;
      if (await this.isDuplicate(dedupKey)) continue;

      await notificationService.notifyWatchlistMatch(release, wl.name, eventType);
      await this.markNotified(dedupKey);
      notificationsCreated++;
    }

    return notificationsCreated;
  }

  private async loadWatchlists(): Promise<Array<{ id: string; name: string; enabled: boolean; rules: WatchlistRule[] }>> {
    try {
      const supabase = getClient();
      const { data } = await supabase
        .from("watchlists")
        .select("id, name, enabled, watchlist_rules(*)")
        .eq("enabled", true);

      if (data?.length) {
        return data.map((wl) => ({
          id: wl.id,
          name: wl.name,
          enabled: wl.enabled,
          rules: (wl.watchlist_rules ?? []) as WatchlistRule[],
        }));
      }
    } catch {
      // fallback
    }

    return DEFAULT_WATCHLISTS;
  }

  private async isDuplicate(key: string): Promise<boolean> {
    if (notifiedKeys.has(key)) return true;

    try {
      const supabase = getClient();
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .contains("metadata", { dedup_key: key });
      return (count ?? 0) > 0;
    } catch {
      return notifiedKeys.has(key);
    }
  }

  private async markNotified(key: string): Promise<void> {
    notifiedKeys.add(key);
    if (notifiedKeys.size > 500) {
      const arr = [...notifiedKeys];
      notifiedKeys.clear();
      arr.slice(-250).forEach((k) => notifiedKeys.add(k));
    }
  }
}

const DEFAULT_WATCHLISTS = [
  {
    id: "wl-nike",
    name: "Nike Drops",
    enabled: true,
    rules: [{ id: "r1", watchlist_id: "wl-nike", field: "brand", operator: "equals" as const, value: "Nike", created_at: "" }],
  },
  {
    id: "wl-extreme",
    name: "EXTREME Alerts",
    enabled: true,
    rules: [{ id: "r2", watchlist_id: "wl-extreme", field: "priority_level", operator: "equals" as const, value: "EXTREME", created_at: "" }],
  },
  {
    id: "wl-cl",
    name: "Champions League",
    enabled: true,
    rules: [{ id: "r3", watchlist_id: "wl-cl", field: "category", operator: "contains" as const, value: "Champions", created_at: "" }],
  },
];

export const watchlistMatcherService = new WatchlistMatcherService();
