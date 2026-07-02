"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropMeta } from "@/lib/drop";
import { formatDrop } from "@/lib/time";
import { formatEur } from "@/lib/money";
import { t } from "@/lib/i18n";
import { Badge, tierBadgeLabel } from "@/components/ui/badge";

interface DropDetailDrawerProps {
  release: EnrichedRelease;
  open: boolean;
  onClose: () => void;
}

function MetricRow({ label, value, tip }: { label: string; value: string; tip: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-titan-border/50 last:border-0">
      <span className="text-xs text-titan-muted" title={tip}>
        {label}
      </span>
      <span className="text-xs font-mono text-zinc-200">{value}</span>
    </div>
  );
}

export function DropDetailDrawer({ release, open, onClose }: DropDetailDrawerProps) {
  if (!open) return null;
  const meta = getDropMeta(release);
  const isTicket = release.release_type === "ticket";

  const groups = [
    {
      title: t("drops.drawer.demand"),
      metrics: [
        { label: t("terms.hype"), value: String(Math.round(release.hype_score)), tip: t("tooltips.hype") },
        { label: t("terms.sellout"), value: `${Math.round(release.sellout_probability)}%`, tip: t("tooltips.sellout") },
        { label: t("terms.momentum"), value: String(release.momentum_score ?? "—"), tip: t("tooltips.momentum") },
      ],
    },
    {
      title: t("drops.drawer.market"),
      metrics: [
        { label: t("terms.liquidity"), value: `${Math.round(release.market_liquidity_score)}%`, tip: t("tooltips.liquidity") },
        { label: t("terms.confidence"), value: `${Math.round(release.resale_confidence_score)}%`, tip: t("tooltips.confidence") },
        { label: t("terms.risk"), value: String(release.risk_score), tip: t("tooltips.risk") },
      ],
    },
    {
      title: t("drops.drawer.pricing"),
      metrics: [
        { label: t("terms.retail"), value: formatEur(release.retail_eur), tip: t("tooltips.retail") },
        { label: t("terms.estResale"), value: formatEur(release.resale_eur_mid), tip: t("tooltips.resale") },
        ...(!isTicket
          ? [
              { label: t("terms.netProfit"), value: formatEur(release.net_profit_mid_eur), tip: t("tooltips.netProfit") },
              { label: t("terms.netRoi"), value: release.net_roi_mid != null ? `${release.net_roi_mid}%` : "—", tip: t("tooltips.netRoi") },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-titan-surface border-l border-titan-border shadow-2xl flex flex-col"
        role="dialog"
        aria-label={release.title}
      >
        <div className="flex items-start justify-between p-4 border-b border-titan-border">
          <div>
            <h2 className="font-semibold text-sm pr-6">{release.title}</h2>
            <p className="text-[10px] text-titan-muted mt-1">{formatDrop(meta)}</p>
            {release.opportunity_action && (
              <Badge variant="tier" label={tierBadgeLabel(release.opportunity_action)} className="mt-2" />
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-titan-muted hover:text-zinc-200" aria-label={t("common.close")}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Link
            href={`/dashboard/drops/${release.id}`}
            className="text-xs text-titan-accent hover:underline block"
            onClick={onClose}
          >
            {t("dropDetail.viewFull")} →
          </Link>
          {groups.map((g) => (
            <section key={g.title}>
              <h3 className="intel-section-title mb-2">{g.title}</h3>
              <div className="rounded-lg border border-titan-border bg-titan-bg/50 px-3">
                {g.metrics.map((m) => (
                  <MetricRow key={m.label} {...m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
