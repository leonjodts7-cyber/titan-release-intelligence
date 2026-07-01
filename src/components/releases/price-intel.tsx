import { cn, formatPrice } from "@/lib/utils";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { TrendingUp, DollarSign } from "lucide-react";

interface PriceIntelProps {
  release: EnrichedRelease;
  compact?: boolean;
  showLabel?: boolean;
}

export function PriceIntel({ release, compact, showLabel = true }: PriceIntelProps) {
  const currency = release.retail_currency ?? release.currency;
  const retail = formatPrice(release.retail_price_min ?? release.price_min, release.retail_price_max ?? release.price_max, currency);

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="text-zinc-500">Retail {retail}</span>
        {release.estimated_resale_mid && (
          <span className="text-green-400 font-mono">
            Est. {currency} {release.estimated_resale_low}–{release.estimated_resale_high}
          </span>
        )}
        {release.expected_roi_mid != null && (
          <span className="text-titan-accent font-mono">+{release.expected_roi_mid}% ROI</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
          <DollarSign className="w-3 h-3" />
          Pricing Intelligence
          {release.is_estimated && (
            <span className="text-yellow-500/80 normal-case">(Estimated)</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-zinc-500">Retail</span>
          <div className="font-mono text-zinc-200">{retail}</div>
        </div>
        {release.estimated_resale_mid && (
          <div>
            <span className="text-zinc-500">Expected resale</span>
            <div className="font-mono text-green-400">
              {currency} {release.estimated_resale_low}–{release.estimated_resale_high}
            </div>
          </div>
        )}
        {release.expected_profit_mid != null && (
          <div>
            <span className="text-zinc-500">Profit</span>
            <div className="font-mono text-green-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +{currency} {release.expected_profit_low}–{release.expected_profit_high}
            </div>
          </div>
        )}
        {release.expected_roi_mid != null && (
          <div>
            <span className="text-zinc-500">ROI</span>
            <div className="font-mono text-titan-accent">
              {release.expected_roi_low}–{release.expected_roi_high}%
            </div>
          </div>
        )}
        <div>
          <span className="text-zinc-500">Confidence</span>
          <div className={cn("font-mono", release.resale_confidence_score >= 80 ? "text-green-400" : "text-yellow-400")}>
            {Math.round(release.resale_confidence_score)}%
          </div>
        </div>
        <div>
          <span className="text-zinc-500">Liquidity</span>
          <div className="font-mono text-zinc-300">{Math.round(release.market_liquidity_score)}%</div>
        </div>
      </div>
    </div>
  );
}
