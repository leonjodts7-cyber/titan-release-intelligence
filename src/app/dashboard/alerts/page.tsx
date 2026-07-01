import { getAlertRules, getAlertEvents } from "@/lib/data/alert-rules";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { AlertsClient } from "./alerts-client";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const [rules, events] = [getAlertRules(), getAlertEvents(30)];

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-3xl">
        <h1 className="text-lg font-bold mb-1">Alert Engine</h1>
        <p className="text-[10px] text-zinc-500 mb-4">
          Threshold monitoring · ROI · opportunity · presale windows · intelligence-only (no checkout automation)
        </p>
        <AlertsClient initialRules={rules} initialEvents={events} />
      </div>
    </IntelligenceLayout>
  );
}
