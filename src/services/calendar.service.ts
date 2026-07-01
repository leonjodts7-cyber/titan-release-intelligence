import type { Release } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/admin";

export class CalendarService {
  async addReleaseEvents(release: Release): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const events = this.buildEvents(release);
    try {
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
      // Calendar events stored when DB available
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
}

export const calendarService = new CalendarService();
