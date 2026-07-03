import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { filterUpcoming } from "@/lib/drops/period-filters";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { KalenderClient } from "./kalender-client";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function KalenderPage() {
  const releases = filterUpcoming(enrichReleases(await getReleases({ sort: "date" })));
  return (
    <DashboardLayout>
      <div className="p-6 max-w-[1600px] space-y-4">
        <header>
          <h1 className="text-2xl font-bold">{t("calendar.title")}</h1>
          <p className="text-sm text-titan-muted mt-1">{t("calendar.subtitle", { count: releases.length })}</p>
        </header>
        <KalenderClient releases={releases} />
      </div>
    </DashboardLayout>
  );
}
