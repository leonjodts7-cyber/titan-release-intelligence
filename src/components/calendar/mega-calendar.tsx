"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  getISOWeek,
} from "date-fns";
import { nl } from "date-fns/locale";
import { Flame } from "lucide-react";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropAt } from "@/lib/drop";
import { dropDayKey, dropHourLabel, tierShortLabel } from "@/lib/tiers";
import {
  MAIN_CATEGORIES,
  type MainCategory,
  classifyRelease,
} from "@/lib/categories/taxonomy";
import { formatTicketEventLine } from "@/lib/tickets/display";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_CHIPS = 4;
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MAIN_KEYS: MainCategory[] = ["schoenen", "tickets", "kaarten", "overig"];

interface MegaCalendarProps {
  releases: EnrichedRelease[];
}

function releasesForDay(releases: EnrichedRelease[], day: Date): EnrichedRelease[] {
  const key = dropDayKey(day.toISOString());
  return releases.filter((r) => {
    const at = getDropAt(r);
    return at && dropDayKey(at) === key;
  });
}

function DayDrawer({
  day,
  items,
  onClose,
}: {
  day: Date;
  items: EnrichedRelease[];
  onClose: () => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<MainCategory, EnrichedRelease[]>();
    for (const r of items) {
      const main = classifyRelease(r).main;
      const list = map.get(main) ?? [];
      list.push(r);
      map.set(main, list);
    }
    return MAIN_KEYS.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
  }, [items]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-titan-surface border-l border-titan-border p-4 overflow-y-auto">
        <h3 className="font-semibold text-sm mb-3 capitalize">
          {format(day, "EEEE d MMMM yyyy", { locale: nl })}
        </h3>
        {grouped.map(([main, list]) => (
          <div key={main} className="mb-4">
            <h4 className={cn("text-xs font-semibold mb-2", MAIN_CATEGORIES[main].color)}>
              {MAIN_CATEGORIES[main].label}
            </h4>
            <ul className="space-y-2">
              {list.map((r) => {
                const hour = dropHourLabel(getDropAt(r), Boolean(r.drop_time_confirmed));
                const tier = tierShortLabel(r.opportunity_action);
                const isTop = tier === "TOP" || tier === "MUST WATCH";
                const eventLine = formatTicketEventLine(r);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/drops/${r.id}`}
                      onClick={onClose}
                      className={cn(
                        "block rounded-lg border px-3 py-2 text-xs hover:border-titan-accent/50 border-l-2 bg-titan-bg/60",
                        MAIN_CATEGORIES[main].border
                      )}
                      title={eventLine ?? r.title}
                    >
                      <span className="font-medium">{r.title}</span>
                      {isTop && <Flame className="inline w-3 h-3 ml-1 text-orange-400" />}
                      {hour && <span className="ml-2 font-mono text-[10px] opacity-80">{hour}</span>}
                      {eventLine && (
                        <span className="block text-[10px] text-titan-muted mt-0.5">{eventLine}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>
    </>
  );
}

export function MegaCalendar({ releases }: MegaCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [drawerDay, setDrawerDay] = useState<{ day: Date; items: EnrichedRelease[] } | null>(null);
  const [mobileWeek, setMobileWeek] = useState(false);
  const [mainFilters, setMainFilters] = useState<Set<MainCategory>>(new Set(MAIN_KEYS));
  const [tierFilter, setTierFilter] = useState("");
  const [confirmedOnly, setConfirmedOnly] = useState(false);

  const filtered = useMemo(() => {
    return releases.filter((r) => {
      const main = classifyRelease(r).main;
      if (!mainFilters.has(main)) return false;
      if (confirmedOnly && !r.drop_time_confirmed) return false;
      if (tierFilter) {
        const tier = tierShortLabel(r.opportunity_action);
        const want = tierFilter === "TOP OPPORTUNITY" ? "TOP" : tierFilter === "MUST WATCH" ? "MUST WATCH" : tierFilter === "HIGH PRIORITY" ? "HIGH" : tierFilter === "WATCH" ? "WATCH" : tierFilter === "IGNORE" ? "BASIS" : tierFilter;
        if (tier !== want) return false;
      }
      return true;
    });
  }, [releases, mainFilters, tierFilter, confirmedOnly]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, []);

  const monthSummary = useMemo(() => {
    const inMonth = filtered.filter((r) => {
      const at = getDropAt(r);
      return at && isSameMonth(new Date(at), month);
    });
    const toppers = inMonth.filter((r) => {
      const t = tierShortLabel(r.opportunity_action);
      return t === "TOP" || t === "MUST WATCH";
    });
    const byDay = new Map<string, number>();
    for (const r of inMonth) {
      const at = getDropAt(r)!;
      const key = dropDayKey(at);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    let busiestKey = "";
    let busiestCount = 0;
    for (const [k, c] of byDay) {
      if (c > busiestCount) {
        busiestCount = c;
        busiestKey = k;
      }
    }
    const busiestLabel = busiestKey
      ? format(new Date(busiestKey), "EEE d", { locale: nl })
      : "—";
    return {
      total: inMonth.length,
      toppers: toppers.length,
      busiest: busiestLabel,
      monthName: format(month, "MMMM", { locale: nl }),
    };
  }, [filtered, month]);

  const gridDays = mobileWeek ? weekDays : days;
  const now = new Date();

  const toggleMain = (main: MainCategory) => {
    setMainFilters((prev) => {
      const next = new Set(prev);
      if (next.has(main)) {
        if (next.size > 1) next.delete(main);
      } else {
        next.add(main);
      }
      return next;
    });
  };

  const weekRows = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < gridDays.length; i += 7) {
      rows.push(gridDays.slice(i, i + 7));
    }
    return rows;
  }, [gridDays]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-titan-muted">
        {t("calendar.monthSummary", {
          month: monthSummary.monthName,
          total: monthSummary.total,
          toppers: monthSummary.toppers,
          busiest: monthSummary.busiest,
        })}
      </p>

      <div className="flex flex-wrap gap-2 items-center text-xs">
        <span className="text-[10px] text-titan-muted mr-1">{t("calendar.legend")}:</span>
        {MAIN_KEYS.map((main) => (
          <button
            key={main}
            type="button"
            onClick={() => toggleMain(main)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] transition-opacity border-titan-border",
              !mainFilters.has(main) && "opacity-30"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", MAIN_CATEGORIES[main].dot)} />
            {MAIN_CATEGORIES[main].label}
          </button>
        ))}
        <select
          className="px-2 py-1 bg-titan-bg border border-titan-border rounded-lg text-[10px]"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="">{t("drops.allTiers")}</option>
          <option value="TOP OPPORTUNITY">TOP</option>
          <option value="MUST WATCH">MUST WATCH</option>
          <option value="HIGH PRIORITY">HIGH</option>
          <option value="WATCH">WATCH</option>
          <option value="IGNORE">BASIS</option>
        </select>
        <label className="flex items-center gap-1 text-titan-muted cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedOnly}
            onChange={(e) => setConfirmedOnly(e.target.checked)}
            className="rounded border-titan-border"
          />
          {t("drops.confirmedOnly")}
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="px-2 py-1 rounded border border-titan-border text-xs hover:bg-titan-bg"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="px-2 py-1 rounded border border-titan-border text-xs hover:bg-titan-bg"
          >
            {t("calendar.today")}
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="px-2 py-1 rounded border border-titan-border text-xs hover:bg-titan-bg"
          >
            →
          </button>
        </div>
        <h3 className="font-medium text-sm capitalize">
          {format(month, "MMMM yyyy", { locale: nl })}
        </h3>
        <button
          type="button"
          className="md:hidden px-2 py-1 rounded border border-titan-border text-[10px]"
          onClick={() => setMobileWeek((v) => !v)}
        >
          {mobileWeek ? t("calendar.monthView") : t("calendar.weekView")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[2rem_repeat(7,1fr)] gap-px bg-titan-border rounded-t-lg overflow-hidden border border-titan-border border-b-0">
            <div className="bg-titan-bg text-[9px] text-titan-muted text-center py-1 font-mono">wk</div>
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-titan-bg text-[10px] text-titan-muted text-center py-1 font-mono uppercase">
                {d}
              </div>
            ))}
          </div>
          {weekRows.map((row, ri) => (
            <div
              key={ri}
              className="grid grid-cols-[2rem_repeat(7,1fr)] gap-px bg-titan-border border-x border-titan-border last:rounded-b-lg last:border-b overflow-hidden"
            >
              <div className="bg-titan-bg text-[9px] text-titan-muted flex items-start justify-center pt-2 font-mono">
                {getISOWeek(row[0]!)}
              </div>
              {row.map((day) => {
                const inMonth = isSameMonth(day, month);
                const past = day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const items = releasesForDay(filtered, day);
                const visible = items.slice(0, MAX_CHIPS);
                const extra = items.length - visible.length;
                const hasTop = items.some((r) => {
                  const tier = tierShortLabel(r.opportunity_action);
                  return tier === "TOP" || tier === "MUST WATCH";
                });

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "bg-titan-surface min-h-[96px] p-1 flex flex-col",
                      !inMonth && "opacity-40",
                      past && inMonth && "opacity-50",
                      isToday(day) && "ring-1 ring-inset ring-titan-accent/60",
                      hasTop && inMonth && "bg-orange-500/5 ring-1 ring-inset ring-orange-500/20"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-mono mb-1",
                        isToday(day) ? "text-titan-accent font-semibold" : "text-titan-muted"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="space-y-0.5 flex-1">
                      {visible.map((r) => {
                        const main = classifyRelease(r).main;
                        const hour = dropHourLabel(getDropAt(r), Boolean(r.drop_time_confirmed));
                        const tier = tierShortLabel(r.opportunity_action);
                        const isTop = tier === "TOP" || tier === "MUST WATCH";
                        const short = r.title.length > 16 ? `${r.title.slice(0, 14)}…` : r.title;
                        const eventLine = formatTicketEventLine(r);
                        return (
                          <Link
                            key={r.id}
                            href={`/dashboard/drops/${r.id}`}
                            className={cn(
                              "block text-[9px] leading-tight truncate rounded px-1 py-0.5 border border-titan-border/40 bg-titan-bg/70 border-l-2",
                              MAIN_CATEGORIES[main].border
                            )}
                            title={eventLine ? `${r.title} · ${eventLine}` : r.title}
                          >
                            {isTop && <Flame className="inline w-2.5 h-2.5 mr-0.5 text-orange-400" />}
                            {short}
                            {hour ? ` · ${hour}` : ""}
                          </Link>
                        );
                      })}
                      {extra > 0 && (
                        <button
                          type="button"
                          onClick={() => setDrawerDay({ day, items })}
                          className="text-[9px] text-titan-accent hover:underline w-full text-left px-1"
                        >
                          {t("calendar.moreOnDay", { count: extra })}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {drawerDay && (
        <DayDrawer day={drawerDay.day} items={drawerDay.items} onClose={() => setDrawerDay(null)} />
      )}
    </div>
  );
}
