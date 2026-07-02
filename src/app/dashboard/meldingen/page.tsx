import { getNotifications } from "@/lib/data/notifications";
import { getAlertRules, getAlertEvents } from "@/lib/data/alert-rules";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { MeldingenClient } from "@/app/dashboard/meldingen/meldingen-client";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MeldingenPage() {
  const notifications = await getNotifications();
  const rules = getAlertRules();
  const events = getAlertEvents(30);

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-3xl">
        <h1 className="text-lg font-semibold mb-1">{t("nav.notifications")}</h1>
        <p className="text-xs text-titan-muted mb-4">{t("meldingen.subtitle")}</p>
        <MeldingenClient notifications={notifications} rules={rules} events={events} />
      </div>
    </IntelligenceLayout>
  );
}
