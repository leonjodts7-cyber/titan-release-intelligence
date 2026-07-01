import { cn, formatPrice } from "@/lib/utils";
import { formatEur, toEur } from "@/lib/money";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { TrendingUp, DollarSign } from "lucide-react";

interface PriceIntelProps {
  release: EnrichedRelease;
  compact?: boolean;
  showLabel?: boolean;
  hideProfit?: boolean;
}

export function PriceIntel({ release, compact, showLabel = true, hideProfit }: PriceIntelProps) {
  const currency = release.retail_currency ?? release.currency;
  const retailOrig = formatPrice(release.retail_price_min ?? release.price_min, release.retail_price_max ?? release.price_max, currency);
  const retailEur = release.retail_eur ?? (release.price_min != null ? toEur((release.price_min + (release.price_max ?? release.price_min)) / 2, currency) : null);
  const resaleEurLow = release.estimated_resale_low != null ? toEur(release.estimated_resale_low, currency) : null;
  const resaleEurHigh = release.estimated_resale_high != null ? toEur(release.estimated_resale_high, currency) : null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        <span className="text-zinc-500" title={`Original: ${retailOrig}`}>Retail {formatEur(retailEur)}</span>
        {!hideProfit && release.estimated_resale_mid && (
          <span className="text-green-400 font-mono" title="Estimated resale range">
            Est. {formatEur(resaleEurLow)}–{formatEur(resaleEurHigh)}
          </span>
        )}
        {!hideProfit && release.net_roi_mid != null && (
          <span className="text-titan-accent font-mono">Net {release.net_roi_mid}%</span>
        )}
        {release.is_estimated && <span className="text-[9px] text-yellow-500/70">estimated</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
          <DollarSign className="w-3 h-3" />
          Pricing Intelligence (EUR)
          {release.is_estimated && (
            <span className="text-yellow-500/80 normal-case">estimated</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-zinc-500">Retail</span>
          <div className="font-mono text-zinc-200" title={`Original: ${retailOrig}`}>{formatEur(retailEur)}</div>
        </div>
        {!hideProfit && release.estimated_resale_mid && (
          <div>
            <span className="text-zinc-500">Expected resale</span>
            <div className="font-mono text-green-400">{formatEur(resaleEurLow)}–{formatEur(resaleEurHigh)}</div>
          </div>
        )}
        {!hideProfit && release.net_profit_mid_eur != null && (
          <div>
            <span className="text-zinc-500">Net profit</span>
            <div className="font-mono text-green-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {formatEur(release.net_profit_mid_eur)}
            </div>
          </div>
        )}
        {!hideProfit && release.net_roi_mid != null && (
          <div>
            <span className="text-zinc-500">Net ROI</span>
            <div className="font-mono text-titan-accent">{release.net_roi_mid}%</div>
          </div>
        )}
        {!hideProfit && release.gross_roi_mid != null && (
          <div>
            <span className="text-zinc-500">Gross ROI</span>
            <div className="font-mono text-zinc-400">{release.gross_roi_mid}%</div>
          </div>
        )}
        <div>
          <span className="text-zinc-500">Confidence</span>
          <div className={cn("font-mono", release.resale_confidence_score >= 65 ? "text-green-400" : "text-yellow-400")}>
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
