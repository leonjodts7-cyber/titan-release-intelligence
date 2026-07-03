"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { filterOpportunities } from "@/lib/data/enrich-releases";
import { sortByDropTime, getDropMeta, type DropCategory } from "@/lib/drop";
import { MonthCalendar } from "@/components/drops/month-calendar";
import { OpportunitiesTable } from "@/components/opportunities/opportunities-table";
import { groupReleasesByTier } from "@/lib/tiers";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";

const TIER_TIP_KEY: Record<string, string> = {
  TOP: "tiers.tip.TOP",
  "MUST WATCH": "tiers.tip.MUST_WATCH",
  HIGH: "tiers.tip.HIGH",
  WATCH: "tiers.tip.WATCH",
  BASIS: "tiers.tip.BASIS",
};

const CATEGORY_MAP: Record<string, DropCategory | undefined> = {
  sneakers: "sneakers",
  tickets: "tickets",
  tcg: "tcg",
  other: "other",
};

export function DropsClient({
  initialReleases,
  includePast = false,
}: {
  initialReleases: EnrichedRelease[];
  includePast?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultView = searchParams.get("view") === "calendar" ? "calendar" : "list";
  const [view, setView] = useState<ViewMode>(defaultView);
  const [category, setCategory] = useState<string>("");
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [tier, setTier] = useState("");
  const [groupByTier, setGroupByTier] = useState(true);

  const filtered = useMemo(() => {
    let items = filterOpportunities(initialReleases, {
      category: category === "sneakers" ? "limited-sneakers" : category === "tickets" ? "concert-tickets" : category === "tcg" ? "tcg-collectibles" : category || undefined,
      action: tier as EnrichedRelease["opportunity_action"] | undefined,
    });

    if (category && CATEGORY_MAP[category]) {
      const cat = CATEGORY_MAP[category]!;
      items = items.filter((r) => getDropMeta(r).dropCategory === cat);
    }

    if (confirmedOnly) {
      items = items.filter((r) => r.drop_time_confirmed);
    }

    return sortByDropTime(items);
  }, [initialReleases, category, confirmedOnly, tier]);

  const tierGrouped = useMemo(() => groupReleasesByTier(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border border-titan-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn("px-3 py-1.5", view === "list" ? "bg-titan-accent/15 text-titan-accent" : "text-titan-muted")}
          >
            {t("drops.viewList")}
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn("px-3 py-1.5", view === "calendar" ? "bg-titan-accent/15 text-titan-accent" : "text-titan-muted")}
          >
            {t("drops.viewCalendar")}
          </button>
        </div>

        <select
          className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t("drops.allCategories")}</option>
          <option value="sneakers">{t("drops.catSneakers")}</option>
          <option value="tickets">{t("drops.catTickets")}</option>
          <option value="tcg">{t("drops.catTcg")}</option>
          <option value="other">{t("drops.catOther")}</option>
        </select>

        <select
          className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <option value="">{t("drops.allTiers")}</option>
          <option value="TOP OPPORTUNITY">TOP</option>
          <option value="MUST WATCH">MUST WATCH</option>
          <option value="HIGH PRIORITY">HIGH</option>
          <option value="WATCH">WATCH</option>
          <option value="IGNORE">BASIS</option>
        </select>

        {view === "list" && (
          <label className="flex items-center gap-1.5 text-xs text-titan-muted cursor-pointer">
            <input
              type="checkbox"
              checked={groupByTier}
              onChange={(e) => setGroupByTier(e.target.checked)}
              className="rounded border-titan-border"
            />
            {t("drops.groupByTier")}
          </label>
        )}

        <label className="flex items-center gap-1.5 text-xs text-titan-muted cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedOnly}
            onChange={(e) => setConfirmedOnly(e.target.checked)}
            className="rounded border-titan-border"
          />
          {t("drops.confirmedOnly")}
        </label>

        <label className="flex items-center gap-1.5 text-xs text-titan-muted cursor-pointer">
          <input
            type="checkbox"
            checked={includePast}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.checked) params.set("showPast", "1");
              else params.delete("showPast");
              router.push(`/dashboard/drops?${params.toString()}`);
            }}
            className="rounded border-titan-border"
          />
          {t("drops.showPast")}
        </label>
      </div>

      {view === "list" ? (
        groupByTier ? (
          <div className="space-y-6">
            {tierGrouped.map(([tierName, items]) => (
              <section key={tierName}>
                <h3 className="intel-section-title mb-2" title={t(TIER_TIP_KEY[tierName] ?? "tiers.tip.BASIS")}>
                  {tierName}
                </h3>
                <OpportunitiesTable initialReleases={items} compact />
              </section>
            ))}
          </div>
        ) : (
          <OpportunitiesTable initialReleases={filtered} />
        )
      ) : (
        <MonthCalendar releases={filtered} />
      )}
    </div>
  );
}
