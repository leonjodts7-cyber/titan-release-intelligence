import Link from "next/link";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { t } from "@/lib/i18n";

export default function InstellingenPage() {
  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-2xl space-y-4">
        <header>
          <h1 className="text-lg font-semibold">{t("instellingen.title")}</h1>
          <p className="text-xs text-titan-muted">{t("instellingen.subtitle")}</p>
        </header>
        <div className="grid gap-2">
          <Link
            href="/dashboard/watchlists"
            className="intel-card hover:border-titan-accent/30 transition-colors text-sm"
          >
            {t("instellingen.tabWatchlists")} →
          </Link>
          <Link
            href="/dashboard/admin/setup"
            className="intel-card hover:border-titan-accent/30 transition-colors text-sm"
          >
            {t("instellingen.tabSetup")} →
          </Link>
        </div>
      </div>
    </IntelligenceLayout>
  );
}
