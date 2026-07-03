"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropMeta } from "@/lib/drop";
import { formatDrop, formatRelative } from "@/lib/time";
import { formatEur } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { whyTierLine, tierShortLabel } from "@/lib/tiers";
import { DropCountdown } from "@/components/drops/drop-countdown";
import { DropDetailDrawer } from "@/components/drops/drop-detail-drawer";
import { t } from "@/lib/i18n";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export function DropDetailView({
  release,
  related,
}: {
  release: EnrichedRelease;
  related: EnrichedRelease[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const meta = getDropMeta(release);
  const isTicket = release.release_type === "ticket";
  const checked = release.source_checked_at
    ? formatDistanceToNow(new Date(release.source_checked_at), { addSuffix: true, locale: nl })
    : null;

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="intel-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-titan-muted mb-1">{release.release_categories?.name}</p>
            <h1 className="text-xl font-semibold">{release.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="font-mono text-sm">{formatDrop(meta)}</span>
              <DropCountdown release={release} />
              <span className="text-xs text-titan-muted">{formatRelative(meta.dropAt)}</span>
            </div>
          </div>
          {release.opportunity_action && (
            <div className="text-right shrink-0">
              <Badge variant="tier" label={tierShortLabel(release.opportunity_action)} className="text-sm px-3 py-1" />
              <p className="text-[10px] text-titan-muted mt-1 font-mono">Score {Math.round(release.opportunity_score)}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-3">{whyTierLine(release)}</p>
        {checked && release.source_name && (
          <p className="text-[10px] text-titan-muted mt-3">
            {t("dropDetail.sourceFreshness", { source: release.source_name, when: checked })}
          </p>
        )}
      </header>

      {release.description && (
        <section className="intel-card">
          <h2 className="intel-section-title mb-2">{t("dropDetail.about")}</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">{release.description}</p>
        </section>
      )}

      <section className="intel-card">
        <h2 className="intel-section-title mb-3">{t("dropDetail.whereToBuy")}</h2>
        {isTicket && (
          <p className="text-[10px] text-titan-muted mb-3">{t("ticket.disclaimer")}</p>
        )}
        <ul className="space-y-2">
          {(release.buy_locations ?? []).map((loc, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm border border-titan-border rounded-lg px-3 py-2 bg-titan-bg/50">
              <div>
                <span className="font-medium">{loc.name}</span>
                <span className="text-titan-muted text-xs ml-2 capitalize">{loc.type}</span>
                {loc.note && <p className="text-[10px] text-titan-muted mt-0.5">{loc.note}</p>}
              </div>
              {loc.url && (
                <a
                  href={loc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-titan-accent hover:underline shrink-0"
                >
                  {t("dropDetail.openStore")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="intel-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="intel-section-title">{t("dropDetail.metrics")}</h2>
          <button type="button" onClick={() => setDrawerOpen(true)} className="text-[10px] text-titan-accent hover:underline">
            {t("drops.moreMetrics")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-titan-muted">{t("terms.retail")}</span><p className="font-mono">{formatEur(release.retail_eur)}</p></div>
          <div><span className="text-titan-muted">{t("terms.estResale")}</span><p className="font-mono text-profit">{formatEur(release.resale_eur_mid)}</p></div>
          {!isTicket && (
            <>
              <div><span className="text-titan-muted">{t("terms.netProfit")}</span><p className="font-mono text-profit">{formatEur(release.net_profit_mid_eur)}</p></div>
              <div><span className="text-titan-muted">{t("terms.netRoi")}</span><p className="font-mono">{release.net_roi_mid != null ? `${release.net_roi_mid}%` : "—"}</p></div>
            </>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="intel-section-title mb-2">{t("dropDetail.related")}</h2>
          <ul className="space-y-1">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/drops/${r.id}`} className="text-sm text-titan-accent hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DropDetailDrawer release={release} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
