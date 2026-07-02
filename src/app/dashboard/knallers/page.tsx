import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { getKnallers, groupKnallersByQuarter } from "@/lib/knallers";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { KnallersClient } from "@/app/dashboard/knallers/knallers-client";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function KnallersPage() {
  const releases = enrichReleases(await getReleases());
  const knallers = getKnallers(releases);
  const grouped = groupKnallersByQuarter(knallers);

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-[1200px]">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">{t("knallers.title")}</h1>
          <p className="text-sm text-titan-muted mt-1">{t("knallers.intro")}</p>
        </header>
        <KnallersClient grouped={grouped} />
      </div>
    </IntelligenceLayout>
  );
}
