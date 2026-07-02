import { getMonitoringSnapshot } from "@/lib/data/monitoring";
import { getSourceAdapters } from "@/lib/data/sources";
import { getScanJobs } from "@/lib/data/sources";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { SysteemClient } from "@/app/dashboard/systeem/systeem-client";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SysteemPage() {
  const monitoring = await getMonitoringSnapshot();
  const sources = await getSourceAdapters();
  const scans = await getScanJobs(20);

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-4xl">
        <h1 className="text-lg font-semibold mb-1">{t("systeem.title")}</h1>
        <p className="text-xs text-titan-muted mb-4">{t("systeem.subtitle")}</p>
        <SysteemClient monitoring={monitoring} sources={sources} scans={scans} />
      </div>
    </IntelligenceLayout>
  );
}
