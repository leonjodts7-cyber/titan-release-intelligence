"use client";

import Link from "next/link";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropMeta } from "@/lib/drop";
import { formatDrop } from "@/lib/time";
import { formatEur } from "@/lib/money";
import { DropCountdown } from "@/components/drops/drop-countdown";
import { Badge, tierBadgeLabel } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

export function KnallersClient({ grouped }: { grouped: [string, EnrichedRelease[]][] }) {
  if (grouped.length === 0) {
    return <p className="text-sm text-titan-muted">{t("knallers.empty")}</p>;
  }

  return (
    <div className="space-y-8">
      {grouped.map(([quarter, items]) => (
        <section key={quarter}>
          <h2 className="intel-section-title mb-3">{quarter}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((r) => {
              const meta = getDropMeta(r);
              const buy = r.buy_locations?.[0];
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/drops/${r.id}`}
                  className="intel-card hover:border-titan-accent/40 transition-colors block p-5"
                >
                  <div className="flex justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-base leading-snug">{r.title}</h3>
                    {r.opportunity_action && (
                      <Badge variant="tier" label={tierBadgeLabel(r.opportunity_action)} />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="font-mono text-sm">{formatDrop(meta)}</span>
                    <DropCountdown release={r} />
                  </div>
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
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
