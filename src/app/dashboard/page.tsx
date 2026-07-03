import { getReleases } from "@/lib/data/releases";
import { getSourceAdapters, getScanJobs } from "@/lib/data/sources";
import { getActivityFeed } from "@/lib/data/activity-feed";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { sortByDropTime } from "@/lib/drop";
import {
  filterTodayTomorrow,
  filterUpcoming,
  topTierLaterYear,
  getBestWeekSection,
} from "@/lib/drops/period-filters";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { DropCard } from "@/components/drops/drop-card";
import { LiveActivityPanel } from "@/components/intelligence/live-activity-panel";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { classifyRelease, MAIN_CATEGORIES, hubRoute, type MainCategory } from "@/lib/categories/taxonomy";
import { tierShortLabel } from "@/lib/tiers";
import { getLastIngestAt } from "@/lib/sources/ingest";

export const dynamic = "force-dynamic";

export default async function VandaagPage() {
  const [raw, sources, scans, feed] = await Promise.all([
    getReleases(),
    getSourceAdapters(),
    getScanJobs(5),
    getActivityFeed(20),
  ]);

  const releases = enrichReleases(raw);
  const now = new Date();
  const upcoming = sortByDropTime(filterUpcoming(releases, now));
  const todayTomorrow = filterTodayTomorrow(upcoming, now);
  const { items: bestWeek, emptyReason: weekEmptyReason } = getBestWeekSection(
    releases,
    todayTomorrow,
    3,
    now
  );
  const laterYear = topTierLaterYear(releases, 3, now).filter(
    (r) => !new Set(todayTomorrow.map((x) => x.id)).has(r.id)
  );

  const hubMains: MainCategory[] = ["schoenen", "tickets", "kaarten"];
  const categoryTiles = hubMains.map((main) => {
    const catReleases = upcoming.filter((r) => classifyRelease(r).main === main);
    const weekCount = catReleases.filter((r) => {
      const at = r.drop_at ?? r.release_starts_at;
      if (!at) return false;
      const t = new Date(at).getTime();
      return t <= now.getTime() + 7 * 86400000;
    }).length;
    const topper = catReleases.find((r) => {
      const tier = tierShortLabel(r.opportunity_action);
      return tier === "TOP" || tier === "MUST WATCH";
    }) ?? catReleases[0];
    return { main, weekCount, topper };
  });

  const onlineSources = sources.filter((s) => s.enabled && !s.last_error).length;
  const lastScan = scans[0];
  const lastIngest = getLastIngestAt();

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 space-y-4 max-w-[1200px]">
        <header>
          <h1 className="text-lg font-semibold">{t("today.title")}</h1>
          <p className="text-xs text-titan-muted">{t("today.subtitle")}</p>
        </header>

        <section>
          <h2 className="intel-section-title mb-2">{t("today.upcoming")}</h2>
          {todayTomorrow.length === 0 ? (
            <p className="text-xs text-titan-muted">{t("today.noUpcoming")}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {todayTomorrow.map((r) => (
                <DropCard key={r.id} release={r} categoryAccent />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="intel-section-title mb-2">{t("today.perCategory")}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {categoryTiles.map(({ main, weekCount, topper }) => {
              const meta = MAIN_CATEGORIES[main];
              return (
                <Link
                  key={main}
                  href={hubRoute(main)}
                  className={cn(
                    "rounded-xl border border-titan-border bg-titan-surface p-3 hover:border-zinc-500 transition-colors border-l-4",
                    meta.border
                  )}
                >
                  <p className={cn("font-semibold text-sm", meta.color)}>{meta.label}</p>
                  <p className="text-[10px] text-titan-muted mt-1">
                    {t("today.dropsNext7", { count: weekCount })}
                  </p>
                  {topper && (
                    <p className="text-xs mt-2 line-clamp-2">
                      <span className="text-titan-muted">{t("today.nextTopper")}: </span>
                      {topper.title}
                    </p>
                  )}
                  <p className="text-[10px] text-titan-accent mt-2">{t("today.openHub")}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="intel-section-title">{t("today.bestWeek")}</h2>
            <Link href="/dashboard/kalender" className="text-[10px] text-titan-accent hover:underline">
              {t("terms.viewAll")}
            </Link>
          </div>
          {bestWeek.length === 0 ? (
            <p className="text-xs text-titan-muted">
              {weekEmptyReason === "all_above"
                ? t("today.weekAllAbove")
                : t("today.noBestWeek")}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {bestWeek.map((r) => (
                <DropCard key={r.id} release={r} compact />
              ))}
            </div>
          )}
        </section>

        {laterYear.length > 0 && bestWeek.length < 3 && (
          <section>
            <h2 className="intel-section-title mb-2">{t("today.laterYear")}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {laterYear.map((r) => (
                <DropCard key={r.id} release={r} compact />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3 text-[10px] text-titan-muted font-mono px-3 py-2 rounded-lg border border-titan-border bg-titan-surface">
          <span>{t("today.systemStatus", { online: onlineSources, total: sources.length })}</span>
          <span>·</span>
          <span>
            {lastScan
              ? t("today.lastScan", {
                  when: formatDistanceToNow(new Date(lastScan.started_at ?? lastScan.created_at), {
                    addSuffix: true,
                    locale: nl,
                  }),
                })
              : t("today.noScan")}
          </span>
          {lastIngest && (
            <>
              <span>·</span>
              <span>
                {t("today.lastIngest", {
                  when: formatDistanceToNow(new Date(lastIngest), { addSuffix: true, locale: nl }),
                })}
              </span>
            </>
          )}
        </div>

        <section className="xl:hidden">
          <h2 className="intel-section-title mb-2">{t("feed.title")}</h2>
          <LiveActivityPanel initialItems={feed} />
        </section>
      </div>
    </IntelligenceLayout>
  );
}
