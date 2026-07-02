import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { cn, formatCountdown, formatDate, priorityColor } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PriceIntel } from "./price-intel";
import { OpportunityBadge } from "./opportunity-badge";

interface ReleaseCardProps {
  release: EnrichedRelease;
  compact?: boolean;
  showUpdate?: string;
  hideProfit?: boolean;
}

export function ReleaseCard({ release, compact, showUpdate, hideProfit }: ReleaseCardProps) {
  const location = [release.cities?.name, release.countries?.name].filter(Boolean).join(", ");
  const eventDate = release.release_starts_at ?? release.presale_starts_at ?? release.general_sale_starts_at;
  const isTicket = release.release_type === "ticket";

  return (
    <div className="p-3 rounded-xl bg-titan-surface border border-titan-border hover:border-zinc-500 transition-all group">
      <Link href={`/dashboard/drops/${release.id}`} className="block">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", {
              "bg-red-500": release.priority_level === "EXTREME",
              "bg-orange-500": release.priority_level === "HIGH",
              "bg-yellow-500": release.priority_level === "MEDIUM",
              "bg-green-500": release.priority_level === "LOW",
            })} />
            <h3
              className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-white transition-colors"
              title={release.title}
            >
              {release.title}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", priorityColor(release.priority_level))}>
              {release.priority_level}
            </span>
            {release.opportunity_action && (
              <OpportunityBadge action={release.opportunity_action} score={release.opportunity_score} compact />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-zinc-500 mb-2">
          {release.release_categories && <span className="text-zinc-400">{release.release_categories.name}</span>}
          {location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{location}</span>}
          <span>{formatDate(eventDate)}</span>
        </div>

        {!hideProfit && !isTicket && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex gap-3 text-[10px] font-mono">
              <span>Hype <b className="text-zinc-200">{Math.round(release.hype_score)}</b></span>
              <span>Sellout <b className="text-zinc-200">{Math.round(release.sellout_probability)}%</b></span>
              {release.net_roi_mid != null && (
                <span className="text-titan-accent">Net <b>{release.net_roi_mid}%</b></span>
              )}
            </div>
            <span className="font-mono text-xs font-bold text-titan-accent shrink-0">{formatCountdown(eventDate)}</span>
          </div>
        )}

        {isTicket && (
          <p className="text-[9px] text-zinc-600 mb-2 leading-snug">
            {t("ticket.disclaimer")}
          </p>
        )}

        <PriceIntel release={release} compact={compact} showLabel={!compact} hideProfit={hideProfit || isTicket} />

        {showUpdate && (
          <div className="mt-2 pt-1.5 border-t border-titan-border text-[10px] text-zinc-500 truncate">{showUpdate}</div>
        )}
      </Link>

      {release.official_url && (
        <a
          href={release.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-[10px] text-titan-accent hover:underline w-fit"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          {t("terms.officialLink")}
        </a>
      )}
    </div>
  );
}
