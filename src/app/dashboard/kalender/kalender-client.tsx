"use client";

import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { MegaCalendar } from "@/components/calendar/mega-calendar";

export function KalenderClient({ releases }: { releases: EnrichedRelease[] }) {
  return <MegaCalendar releases={releases} />;
}
