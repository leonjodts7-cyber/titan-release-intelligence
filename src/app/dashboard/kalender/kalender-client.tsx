"use client";

import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { MegaCalendar } from "@/components/calendar/mega-calendar";
import { t } from "@/lib/i18n";

export function KalenderClient({ releases }: { releases: EnrichedRelease[] }) {
  if (releases.length === 0) {
    return <p className="text-sm text-titan-muted py-8 text-center">{t("calendar.empty")}</p>;
  }
  return <MegaCalendar releases={releases} />;
}
