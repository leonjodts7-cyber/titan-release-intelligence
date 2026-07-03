"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { sortByDropTime, getDropMeta } from "@/lib/drop";
import { groupReleasesByTier, tierShortLabel } from "@/lib/tiers";
import {
  MAIN_CATEGORIES,
  type MainCategory,
  classifyRelease,
  countBySub,
  subLabel,
} from "@/lib/categories/taxonomy";
import { saleTypeLabel } from "@/lib/categories/sale-labels";
import { OpportunitiesTable } from "@/components/opportunities/opportunities-table";
import { DropCountdown } from "@/components/drops/drop-countdown";
import { formatDrop } from "@/lib/time";
import { Badge, tierBadgeLabel } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CategoryHubClientProps {
  main: MainCategory;
  releases: EnrichedRelease[];
}

export function CategoryHubClient({ main, releases }: CategoryHubClientProps) {
  const meta = MAIN_CATEGORIES[main];
  const [subFilter, setSubFilter] = useState<string>("all");

  const categoryReleases = useMemo(
    () => sortByDropTime(releases.filter((r) => classifyRelease(r).main === main)),
    [releases, main]
  );

  const filtered = useMemo(() => {
    if (subFilter === "all") return categoryReleases;
    return categoryReleases.filter((r) => classifyRelease(r).sub === subFilter);
  }, [categoryReleases, subFilter]);

  const counts = useMemo(() => countBySub(categoryReleases, main), [categoryReleases, main]);

  const nextThree = useMemo(() => categoryReleases.slice(0, 3), [categoryReleases]);

  const toppers = useMemo(
    () =>
      categoryReleases.filter((r) => {
        const tier = tierShortLabel(r.opportunity_action);
        return tier === "TOP" || tier === "MUST WATCH";
      }),
    [categoryReleases]
  );

  const tierGrouped = useMemo(() => groupReleasesByTier(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className={cn("text-2xl font-bold", meta.color)}>{meta.label}</h1>
        <p className="text-sm text-titan-muted mt-1">
          {t("hubs.subtitle", { count: categoryReleases.length })}
        </p>
        {main === "tickets" && (
          <p className="text-[11px] text-amber-400/90 mt-2 border border-amber-500/30 rounded-lg px-3 py-2 bg-amber-500/5">
            {t("ticket.disclaimer")}
          </p>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs border transition-colors",
            subFilter === "all"
              ? "bg-titan-accent/20 border-titan-accent text-titan-accent"
              : "border-titan-border text-titan-muted hover:border-zinc-500"
          )}
        >
          {t("terms.all")} ({counts.all ?? 0})
        </button>
        {meta.subcategories.map((sub) => (
          <button
            key={sub.slug}
            type="button"
            onClick={() => setSubFilter(sub.slug)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors",
              subFilter === sub.slug
                ? "bg-titan-accent/20 border-titan-accent text-titan-accent"
                : "border-titan-border text-titan-muted hover:border-zinc-500"
            )}
          >
            {sub.label} ({counts[sub.slug] ?? 0})
          </button>
        ))}
      </div>

      {nextThree.length > 0 && (
        <section>
          <h2 className="intel-section-title mb-2">{t("hubs.nextDrops")}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {nextThree.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/drops/${r.id}`}
                className={cn(
                  "rounded-xl border border-titan-border bg-titan-surface p-3 hover:border-zinc-500 transition-colors border-l-4",
                  meta.border
                )}
              >
                <p className="font-medium text-sm line-clamp-2">{r.title}</p>
                <p className="text-[10px] text-titan-muted mt-1">
                  {subLabel(main, classifyRelease(r).sub)}
                  {saleTypeLabel(r) && ` · ${saleTypeLabel(r)}`}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs font-mono">
                  <span>{formatDrop(getDropMeta(r))}</span>
                  <DropCountdown release={r} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {toppers.length > 0 && (
        <section>
          <h2 className="intel-section-title mb-2">{t("hubs.toppers")}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {toppers.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/drops/${r.id}`}
                className={cn(
                  "rounded-xl border border-titan-border bg-titan-surface p-3 hover:border-zinc-500 border-l-4",
                  meta.border
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-2">{r.title}</p>
                  {r.opportunity_action && (
                    <Badge variant="tier" label={tierBadgeLabel(r.opportunity_action)} className="shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-titan-muted mt-1">
                  {formatDrop(getDropMeta(r))}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="intel-section-title">{t("hubs.allDrops")}</h2>
        {tierGrouped.map(([tier, items]) => (
          <div key={tier}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-titan-muted mb-2">{tier}</h3>
            <OpportunitiesTable initialReleases={items} compact />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-titan-muted">{t("hubs.empty")}</p>
        )}
      </section>
    </div>
  );
}
