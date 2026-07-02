"use client";

import { useState } from "react";
import Link from "next/link";
import { Footprints, Ticket, Layers, Package, ChevronRight } from "lucide-react";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getDropMeta, type DropCategory } from "@/lib/drop";
import { formatDrop, formatDropTime } from "@/lib/time";
import { formatEur } from "@/lib/money";
import { Badge, tierBadgeLabel } from "@/components/ui/badge";
import { DropCountdown } from "@/components/drops/drop-countdown";
import { DropDetailDrawer } from "@/components/drops/drop-detail-drawer";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<DropCategory, typeof Package> = {
  sneakers: Footprints,
  tickets: Ticket,
  tcg: Layers,
  other: Package,
};

interface DropCardProps {
  release: EnrichedRelease;
  compact?: boolean;
}

export function DropCard({ release, compact }: DropCardProps) {
  const [open, setOpen] = useState(false);
  const meta = getDropMeta(release);
  const Icon = CATEGORY_ICONS[meta.dropCategory];
  const isTicket = release.release_type === "ticket";
  const profitMid = release.net_profit_mid_eur ?? release.expected_profit_mid;
  const profitLow = profitMid != null ? Math.round(profitMid * 0.7) : null;
  const profitHigh = profitMid != null ? Math.round(profitMid * 1.3) : null;

  const coreStat =
    !isTicket && profitLow != null && profitHigh != null
      ? t("drops.netProfitRange", {
          low: formatEur(profitLow),
          high: formatEur(profitHigh),
        })
      : isTicket
        ? t("drops.ticketMonitor")
        : "—";

  const eventLabel =
    meta.dropEventKind === "preorder"
      ? t("drops.eventPreorder")
      : meta.dropEventKind === "presale"
        ? t("drops.eventPresale")
        : t("drops.eventRelease");

  return (
    <>
      <article
        className={cn(
          "rounded-xl border border-titan-border bg-titan-surface hover:border-zinc-500 transition-all",
          compact ? "p-2.5" : "p-3"
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-titan-bg border border-titan-border flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-titan-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/drops/${release.id}`}
                  className="font-medium text-sm leading-snug line-clamp-2 hover:text-white"
                >
                  {release.title}
                </Link>
                <p className="text-[10px] text-titan-muted mt-0.5">
                  {release.release_categories?.name}
                  {meta.dropCategory === "tcg" && (
                    <span className="ml-1 text-titan-accent">· {eventLabel}</span>
                  )}
                </p>
              </div>
              {release.opportunity_action && (
                <Badge variant="tier" label={tierBadgeLabel(release.opportunity_action)} className="shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={cn(
                  "text-xs font-mono tabular-nums",
                  meta.dropTimeConfirmed ? "text-zinc-200" : "text-titan-muted"
                )}
              >
                {formatDrop(meta)}
              </span>
              <DropCountdown release={release} />
            </div>

            <p className="text-xs text-profit font-medium mt-2">{coreStat}</p>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 flex items-center gap-1 text-[10px] text-titan-muted hover:text-titan-accent transition-colors"
            >
              {t("drops.moreMetrics")}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </article>

      <DropDetailDrawer release={release} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
