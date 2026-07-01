import type { Release } from "@/types";
import { createServiceClient, createAnonServiceClient } from "@/lib/supabase/admin";

function getClient() {
  try {
    return createServiceClient();
  } catch {
    return createAnonServiceClient();
  }
}

export class CalendarService {
  async addReleaseEvents(release: Release): Promise<void> {
    const events = this.buildEvents(release);
    try {
      const supabase = getClient();
      for (const event of events) {
        await supabase.from("calendar_events").upsert(
          {
            release_id: release.id,
            user_id: null,
            event_type: event.type,
            starts_at: event.startsAt,
            ends_at: event.endsAt,
            title: event.title,
            description: event.description,
          },
          { onConflict: "release_id,event_type" }
        );
      }
    } catch {
      // Calendar events stored in DB when available
    }
  }

  buildEvents(release: Release): Array<{
    type: string;
    startsAt: string;
    endsAt: string | null;
    title: string;
    description: string;
  }> {
    const events = [];

    if (release.presale_starts_at) {
      events.push({
        type: "presale",
        startsAt: release.presale_starts_at,
        endsAt: null,
        title: `Presale: ${release.title}`,
        description: `Presale starts for ${release.title}`,
      });
    }

    if (release.general_sale_starts_at) {
      events.push({
        type: "general_sale",
        startsAt: release.general_sale_starts_at,
        endsAt: null,
        title: `General Sale: ${release.title}`,
        description: `General sale starts for ${release.title}`,
      });
    }

    if (release.release_starts_at) {
      events.push({
        type: "release",
        startsAt: release.release_starts_at,
        endsAt: release.release_ends_at,
        title: release.title,
        description: release.description ?? release.title,
      });
    }

    return events;
  }

  async getEvents(filter: "today" | "tomorrow" | "week" | "month" | "extreme" = "week") {
    const now = new Date();
    let start = now;
    let end = new Date(now.getTime() + 7 * 86400000);

    switch (filter) {
      case "today":
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case "tomorrow":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
        break;
      case "month":
        end = new Date(now.getTime() + 30 * 86400000);
        break;
    }

    try {
      const supabase = getClient();
      let query = supabase
        .from("calendar_events")
        .select("*, releases(*, release_categories(name))")
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", { ascending: true });

      const { data } = await query;
      return data ?? [];
    } catch {
      return [];
    }
  }
}

export const calendarService = new CalendarService();
