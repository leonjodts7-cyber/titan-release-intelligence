import { getReleases, countLiveReleases } from "@/lib/data/releases";
import { getDataModeState } from "@/lib/data/mode";
import { getMonitoringSnapshot } from "@/lib/data/monitoring";
import { getSourceAdapters, getScanJobs } from "@/lib/data/sources";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { SysteemClient } from "@/app/dashboard/systeem/systeem-client";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SysteemPage() {
  await getReleases({ limit: 1 });
  const modeState = getDataModeState();
  const releaseCount = await countLiveReleases();

  const monitoring = await getMonitoringSnapshot();
  const sources = await getSourceAdapters();
  const scans = await getScanJobs(20);

  const health = {
    mode: modeState.mode,
    database: {
      reachable: modeState.reason !== "not_configured" && modeState.reason !== "schema_missing",
      releaseCount,
    },
  };

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-4xl">
        <h1 className="text-lg font-semibold mb-1">{t("systeem.title")}</h1>
        <p className="text-xs text-titan-muted mb-4">{t("systeem.subtitle")}</p>
        <SysteemClient monitoring={monitoring} sources={sources} scans={scans} health={health} />
      </div>
    </IntelligenceLayout>
  );
}
