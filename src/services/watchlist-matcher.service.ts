import type { Release } from "@/types";
import { watchlistService } from "./watchlist.service";
import { notificationService } from "./notification.service";
import { getSupabaseClient } from "@/lib/supabase/admin";
import { getWatchlists } from "@/lib/data/notifications";

const notifiedKeys = new Set<string>();

export class WatchlistMatcherService {
  async processRelease(release: Release, eventType: "new_release" | "update"): Promise<number> {
    const watchlists = await getWatchlists();
    let notificationsCreated = 0;

    for (const wl of watchlists) {
      if (!wl.enabled || !wl.watchlist_rules?.length) continue;

      if (!watchlistService.matchRelease(release, wl.watchlist_rules)) continue;

      const dedupKey = `${wl.id}:${release.id}:${eventType}`;
      if (await this.isDuplicate(dedupKey)) continue;

      await notificationService.notifyWatchlistMatch(release, wl.name, eventType);
      await this.markNotified(dedupKey);
      notificationsCreated++;
    }

    return notificationsCreated;
  }

  private async isDuplicate(key: string): Promise<boolean> {
    if (notifiedKeys.has(key)) return true;

    const supabase = getSupabaseClient();
    if (!supabase) return notifiedKeys.has(key);

    try {
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

export const watchlistMatcherService = new WatchlistMatcherService();
