import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import type { Release } from "@/types";
import { cn, formatCountdown, formatDate, priorityColor, formatPrice } from "@/lib/utils";

interface ReleaseCardProps {
  release: Release;
  compact?: boolean;
  showUpdate?: string;
}

export function ReleaseCard({ release, compact, showUpdate }: ReleaseCardProps) {
  const location = [release.cities?.name, release.countries?.name].filter(Boolean).join(", ");
  const eventDate = release.release_starts_at ?? release.presale_starts_at ?? release.general_sale_starts_at;

  return (
    <Link
      href={`/dashboard/releases/${release.id}`}
      className="block p-4 rounded-xl bg-titan-surface border border-titan-border hover:border-zinc-600 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("w-2 h-2 rounded-full shrink-0", {
            "bg-red-500": release.priority_level === "EXTREME",
            "bg-orange-500": release.priority_level === "HIGH",
            "bg-yellow-500": release.priority_level === "MEDIUM",
            "bg-green-500": release.priority_level === "LOW",
          })} />
          <h3 className="font-medium text-sm truncate group-hover:text-white transition-colors">
            {release.title}
          </h3>
        </div>
        <span className={cn("text-xs px-2 py-0.5 rounded border shrink-0", priorityColor(release.priority_level))}>
          {release.priority_level}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 mb-3">
        {release.release_categories && (
          <span className="text-zinc-400">{release.release_categories.name}</span>
        )}
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {location}
          </span>
        )}
        <span>{formatDate(eventDate)}</span>
      </div>

      {!compact && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <ScorePill label="Hype" value={release.hype_score} />
          <ScorePill label="Sellout" value={release.sellout_probability} suffix="%" />
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-titan-accent">
              {formatCountdown(eventDate)}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">Countdown</div>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-titan-accent font-bold">{formatCountdown(eventDate)}</span>
          <span className="text-zinc-500">Hype {release.hype_score}</span>
        </div>
      )}

      {showUpdate && (
        <div className="mt-2 pt-2 border-t border-titan-border text-xs text-zinc-500 truncate">
          {showUpdate}
        </div>
      )}

      {release.official_url && !compact && (
        <div className="mt-2 flex items-center gap-1 text-xs text-titan-accent">
          <ExternalLink className="w-3 h-3" />
          Official link ready
        </div>
      )}

      {!compact && (release.price_min || release.price_max) && (
        <div className="mt-1 text-xs text-zinc-500">
          {formatPrice(release.price_min, release.price_max, release.currency)}
        </div>
      )}
    </Link>
  );
}

function ScorePill({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-mono font-semibold">{Math.round(value)}{suffix}</div>
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
    </div>
  );
}
