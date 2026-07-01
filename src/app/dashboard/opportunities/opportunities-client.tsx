"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OpportunityFilters, OpportunityAction } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { filterOpportunities } from "@/lib/data/enrich-releases";
import { formatDate, formatPrice } from "@/lib/utils";
import { OpportunityBadge } from "@/components/releases/opportunity-badge";
import { ExternalLink } from "lucide-react";

export function OpportunitiesClient({ initialReleases }: { initialReleases: EnrichedRelease[] }) {
  const [filters, setFilters] = useState<OpportunityFilters>({ sort: "opportunity" });

  const ranked = useMemo(() => filterOpportunities(initialReleases, filters), [initialReleases, filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-titan-surface border border-titan-border">
        <input
          type="text"
          placeholder="Search..."
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs min-w-[160px]"
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <select
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
        >
          <option value="">All categories</option>
          <option value="concert-tickets">Concerts</option>
          <option value="sport-tickets">Sports</option>
          <option value="limited-sneakers">Sneakers</option>
          <option value="tcg-collectibles">TCG</option>
          <option value="fashion-drops">Fashion</option>
          <option value="gaming">Gaming</option>
        </select>
        <select
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          onChange={(e) => setFilters((f) => ({ ...f, action: (e.target.value as OpportunityAction) || undefined }))}
        >
          <option value="">All actions</option>
          <option value="MUST WATCH">MUST WATCH</option>
          <option value="PRIORITY">PRIORITY</option>
          <option value="PREPARE">PREPARE</option>
          <option value="WATCH">WATCH</option>
        </select>
        <select
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          value={filters.sort ?? "opportunity"}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as OpportunityFilters["sort"] }))}
        >
          <option value="opportunity">Sort: Opportunity</option>
          <option value="roi">Sort: ROI</option>
          <option value="profit">Sort: Profit</option>
          <option value="date">Sort: Date</option>
          <option value="urgency">Sort: Urgency</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-titan-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-titan-surface text-zinc-500 uppercase text-[10px]">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Release</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Starts</th>
              <th className="p-2 text-right">Retail</th>
              <th className="p-2 text-right">Est. Resale</th>
              <th className="p-2 text-right">Profit</th>
              <th className="p-2 text-right">ROI</th>
              <th className="p-2 text-right">Liq.</th>
              <th className="p-2 text-right">Risk</th>
              <th className="p-2 text-right">Conf.</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.id} className="border-t border-titan-border hover:bg-white/[0.02]">
                <td className="p-2 font-mono text-zinc-500">{i + 1}</td>
                <td className="p-2">
                  <Link href={`/dashboard/releases/${r.id}`} className="font-medium hover:text-titan-accent">
                    {r.title}
                  </Link>
                </td>
                <td className="p-2 text-zinc-500">{r.release_categories?.name ?? "—"}</td>
                <td className="p-2 text-zinc-400 font-mono">{formatDate(r.release_starts_at)}</td>
                <td className="p-2 text-right font-mono">{formatPrice(r.price_min, r.price_max, r.currency)}</td>
                <td className="p-2 text-right font-mono text-green-400">
                  {r.estimated_resale_mid ? `${r.currency} ${r.estimated_resale_low}–${r.estimated_resale_high}` : "—"}
                </td>
                <td className="p-2 text-right font-mono text-green-400">
                  {r.expected_profit_mid != null ? `+${r.currency} ${r.expected_profit_low}–${r.expected_profit_high}` : "—"}
                </td>
                <td className="p-2 text-right font-mono text-titan-accent">
                  {r.expected_roi_mid != null ? `${r.expected_roi_mid}%` : "—"}
                </td>
                <td className="p-2 text-right font-mono">{Math.round(r.market_liquidity_score)}</td>
                <td className="p-2 text-right font-mono">{r.risk_score}</td>
                <td className="p-2 text-right font-mono">{Math.round(r.resale_confidence_score)}%</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <OpportunityBadge action={r.opportunity_action} score={r.opportunity_score} compact />
                    {r.official_url && (
                      <a href={r.official_url} target="_blank" rel="noopener noreferrer" className="text-titan-accent">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ranked.length === 0 && (
        <div className="text-center text-zinc-500 py-12">No opportunities match filters</div>
      )}
    </div>
  );
}
