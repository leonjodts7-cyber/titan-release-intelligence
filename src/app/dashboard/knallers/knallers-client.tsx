"use client";

import Link from "next/link";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropAt, getDropMeta } from "@/lib/drop";
import { formatDrop } from "@/lib/time";
import { formatEur } from "@/lib/money";
import { formatTicketEventLine } from "@/lib/tickets/display";
import { DropCountdown } from "@/components/drops/drop-countdown";
import { Badge, tierBadgeLabel } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function KnallersClient({ grouped }: { grouped: [string, EnrichedRelease[]][] }) {
  if (grouped.length === 0) {
    return <p className="text-sm text-titan-muted">{t("knallers.empty")}</p>;
  }

  return (
    <div className="space-y-10">
      {grouped.map(([quarter, items]) => (
        <section key={quarter}>
          <h2 className="intel-section-title mb-4">{quarter}</h2>
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-titan-border" aria-hidden />
            <ul className="space-y-6">
              {items.map((r) => {
                const meta = getDropMeta(r);
                const buy = r.buy_locations?.[0];
                const at = getDropAt(r);
                const eventLine = formatTicketEventLine(r);
                return (
                  <li key={r.id} className="relative">
                    <span
                      className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full border-2 border-titan-accent bg-titan-bg"
                      aria-hidden
                    />
                    {at && (
                      <time className="text-[10px] font-mono text-titan-muted block mb-1">
                        {formatDrop(meta)}
                      </time>
                    )}
                    <Link
                      href={`/dashboard/drops/${r.id}`}
                      className={cn(
                        "intel-card hover:border-titan-accent/40 transition-colors block p-4 ml-2"
                      )}
                    >
                      <div className="flex justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-base leading-snug">{r.title}</h3>
                        {r.opportunity_action && (
                          <Badge variant="tier" label={tierBadgeLabel(r.opportunity_action)} />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <DropCountdown release={r} />
                      </div>
                      {eventLine && (
                        <p className="text-[10px] text-titan-muted mb-2">{eventLine}</p>
                      )}
                      {r.hype_reason && (
                        <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{r.hype_reason}</p>
                      )}
                      <p className="text-sm font-medium text-profit mb-2">
                        {t("drops.netProfitRange", {
                          low: formatEur((r.net_profit_mid_eur ?? 0) * 0.7),
                          high: formatEur((r.net_profit_mid_eur ?? 0) * 1.3),
                        })}
                      </p>
                      {buy && (
                        <p className="text-[10px] text-titan-muted">
                          {t("knallers.topStore", { store: buy.name })}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
