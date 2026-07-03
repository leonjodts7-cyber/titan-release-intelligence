"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import type { OpportunityFilters, OpportunityAction } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { filterOpportunities } from "@/lib/data/enrich-releases";
import {
  OPPORTUNITY_COLUMNS,
  DEFAULT_COLUMN_IDS,
  EXTRA_COLUMN_IDS,
  getOpportunityCellValue,
  sortOpportunityReleases,
  tierLabel,
  type OpportunitySortKey,
} from "@/lib/opportunities-table";
import { DropCountdown } from "@/components/drops/drop-countdown";
import { Badge, tierBadgeLabel } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { tierShortLabel, TIER_BORDER } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const TICKET_SLUGS = new Set([
  "concert-tickets", "sport-tickets", "super-bowl", "champions-league", "world-cup", "festivals",
]);

export function OpportunitiesTable({
  initialReleases,
  compact = false,
}: {
  initialReleases: EnrichedRelease[];
  compact?: boolean;
}) {
  const [filters, setFilters] = useState<OpportunityFilters>({ sort: "opportunity" });
  const [showTicketProfit, setShowTicketProfit] = useState(false);
  const [sortKey, setSortKey] = useState<OpportunitySortKey>("opportunity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => filterOpportunities(initialReleases, filters), [initialReleases, filters]);
  const ranked = useMemo(() => {
    const sorted = sortOpportunityReleases(filtered, sortKey);
    return sortDir === "asc" ? sorted.reverse() : sorted;
  }, [filtered, sortKey, sortDir]);

  const [showExtraCols, setShowExtraCols] = useState(false);

  const visibleColumns = useMemo(() => {
    const ids = new Set<string>(
      showExtraCols ? [...DEFAULT_COLUMN_IDS, ...EXTRA_COLUMN_IDS] : [...DEFAULT_COLUMN_IDS]
    );
    return OPPORTUNITY_COLUMNS.filter((c) => ids.has(c.id));
  }, [showExtraCols]);

  const isTicketView = filters.category
    ? TICKET_SLUGS.has(filters.category)
    : ranked.some((r) => r.release_type === "ticket");

  const toggleSort = (key: OpportunitySortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setFilters((f) => ({ ...f, sort: key as OpportunityFilters["sort"] }));
  };

  return (
    <div className="space-y-4">
      {!compact && (
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-titan-surface border border-titan-border">
        <input
          type="text"
          placeholder={t("opportunities.search")}
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs min-w-[160px]"
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <select
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
        >
          <option value="">{t("opportunities.allCategories")}</option>
          <option value="concert-tickets">{t("opportunities.categories.concerts")}</option>
          <option value="sport-tickets">{t("opportunities.categories.sports")}</option>
          <option value="limited-sneakers">{t("opportunities.categories.sneakers")}</option>
          <option value="tcg-collectibles">{t("opportunities.categories.tcg")}</option>
          <option value="fashion-drops">{t("opportunities.categories.fashion")}</option>
          <option value="gaming">{t("opportunities.categories.gaming")}</option>
        </select>
        <select
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          onChange={(e) => setFilters((f) => ({ ...f, action: (e.target.value as OpportunityAction) || undefined }))}
        >
          <option value="">{t("opportunities.allActions")}</option>
          <option value="TOP OPPORTUNITY">TOP</option>
          <option value="MUST WATCH">MUST WATCH</option>
          <option value="HIGH PRIORITY">HIGH</option>
          <option value="PREPARE">WATCH</option>
          <option value="WATCH">WATCH</option>
        </select>
        {isTicketView && (
          <label className="flex items-center gap-1.5 text-caption text-titan-muted px-2">
            <input type="checkbox" checked={showTicketProfit} onChange={(e) => setShowTicketProfit(e.target.checked)} />
            {t("ticket.showProfitRoi")}
          </label>
        )}
        <button
          type="button"
          onClick={() => setShowExtraCols((v) => !v)}
          className="px-3 py-1.5 text-xs border border-titan-border rounded-lg text-titan-muted hover:text-zinc-200"
        >
          {showExtraCols ? t("drops.fewerColumns") : t("drops.moreColumns")}
        </button>
      </div>
      )}

      {!compact && isTicketView && !showTicketProfit && (
        <p className="text-caption text-titan-muted px-1">{t("ticket.disclaimer")}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-titan-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-titan-surface text-titan-muted uppercase text-[10px]">
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "p-2 whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left",
                    col.numeric && "tabular-nums"
                  )}
                >
                  {col.sortKey ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.sortKey!)}
                      className="inline-flex items-center gap-0.5 hover:text-zinc-200"
                    >
                      {col.label}
                      {sortKey === col.sortKey &&
                        (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => {
              const hideProfit = r.release_type === "ticket" && !showTicketProfit;
              const tier = tierShortLabel(r.opportunity_action);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-t border-titan-border hover:bg-white/[0.02] border-l-2",
                    TIER_BORDER[tier] ?? "border-l-transparent"
                  )}
                >
                  {visibleColumns.map((col) => {
                    if (col.id === "release") {
                      return (
                        <td key={col.id} className="p-2 max-w-[220px]">
                          <Link
                            href={`/dashboard/drops/${r.id}`}
                            className="font-medium hover:text-titan-accent line-clamp-2 leading-snug"
                            title={r.title}
                          >
                            {r.title}
                          </Link>
                        </td>
                      );
                    }
                    if (col.id === "start") {
                      const cell = getOpportunityCellValue(col.id, r, i + 1, hideProfit);
                      return (
                        <td key={col.id} className="p-2">
                          <div className="flex flex-col gap-1">
                            <span className={cn(cell.muted && "text-titan-muted")}>{cell.display}</span>
                            <DropCountdown release={r} />
                          </div>
                        </td>
                      );
                    }
                    if (col.id === "action") {
                      return (
                        <td key={col.id} className="p-2">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Badge variant="tier" label={tierBadgeLabel(r.opportunity_action)} compact />
                            {r.official_url && (
                              <a
                                href={r.official_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-titan-accent shrink-0"
                                title={t("terms.officialLink")}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                      );
                    }
                    const cell = getOpportunityCellValue(col.id, r, i + 1, hideProfit);
                    return (
                      <td
                        key={col.id}
                        className={cn(
                          "p-2 font-mono tabular-nums",
                          col.align === "right" ? "text-right" : "text-left",
                          cell.muted && "text-titan-muted",
                          cell.className
                        )}
                        title={cell.title}
                      >
                        {cell.display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ranked.length === 0 && <EmptyState message={t("opportunities.empty")} />}
    </div>
  );
}
