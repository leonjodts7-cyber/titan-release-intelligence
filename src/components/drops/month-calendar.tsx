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
} from "date-fns";
import { nl } from "date-fns/locale";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropAt } from "@/lib/drop";
import { dropDayKey, dropHourLabel, TIER_CHIP, tierShortLabel } from "@/lib/tiers";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_CHIPS = 3;
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

interface MonthCalendarProps {
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
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-titan-surface border-l border-titan-border p-4 overflow-y-auto">
        <h3 className="font-semibold text-sm mb-3 capitalize">
          {format(day, "EEEE d MMMM yyyy", { locale: nl })}
        </h3>
        <ul className="space-y-2">
          {items.map((r) => {
            const tier = tierShortLabel(r.opportunity_action);
            const hour = dropHourLabel(getDropAt(r), Boolean(r.drop_time_confirmed));
            return (
              <li key={r.id}>
                <Link
                  href={`/dashboard/drops/${r.id}`}
                  onClick={onClose}
                  className={cn(
                    "block rounded-lg border px-3 py-2 text-xs hover:border-titan-accent/50",
                    TIER_CHIP[tier]
                  )}
                >
                  <span className="font-medium">{r.title}</span>
                  {hour && <span className="ml-2 font-mono text-[10px] opacity-80">{hour}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}

export function MonthCalendar({ releases }: MonthCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [drawerDay, setDrawerDay] = useState<{ day: Date; items: EnrichedRelease[] } | null>(null);
  const [mobileWeek, setMobileWeek] = useState(false);

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

  const gridDays = mobileWeek ? weekDays : days;
  const now = new Date();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["TOP", "MUST WATCH", "HIGH", "WATCH", "BASIS"] as const).map((tier) => (
          <span key={tier} className={cn("px-2 py-0.5 rounded border text-[10px]", TIER_CHIP[tier])}>
            {tier}
          </span>
        ))}
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

      <div className="grid grid-cols-7 gap-px bg-titan-border rounded-lg overflow-hidden border border-titan-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-titan-bg text-[10px] text-titan-muted text-center py-1 font-mono uppercase">
            {d}
          </div>
        ))}
        {gridDays.map((day) => {
          const inMonth = isSameMonth(day, month);
          const past = day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const items = releasesForDay(releases, day);
          const visible = items.slice(0, MAX_CHIPS);
          const extra = items.length - visible.length;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-titan-surface min-h-[88px] p-1 flex flex-col",
                !inMonth && "opacity-40",
                past && inMonth && "opacity-50",
                isToday(day) && "ring-1 ring-inset ring-titan-accent/60"
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
                  const tier = tierShortLabel(r.opportunity_action);
                  const hour = dropHourLabel(getDropAt(r), Boolean(r.drop_time_confirmed));
                  const short = r.title.length > 18 ? `${r.title.slice(0, 16)}…` : r.title;
                  return (
                    <Link
                      key={r.id}
                      href={`/dashboard/drops/${r.id}`}
                      className={cn(
                        "block text-[9px] leading-tight truncate rounded px-1 py-0.5 border",
                        TIER_CHIP[tier]
                      )}
                      title={r.title}
                    >
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

      {drawerDay && (
        <DayDrawer day={drawerDay.day} items={drawerDay.items} onClose={() => setDrawerDay(null)} />
      )}
    </div>
  );
}
