"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OpportunityFilters, OpportunityAction } from "@/types";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { filterOpportunities } from "@/lib/data/enrich-releases";
import { formatDate } from "@/lib/utils";
import { formatEur, toEur } from "@/lib/money";
import { OpportunityBadge } from "@/components/releases/opportunity-badge";
import { ExternalLink } from "lucide-react";

const TICKET_SLUGS = new Set(["concert-tickets", "sport-tickets", "super-bowl", "champions-league", "world-cup", "festivals"]);

export function OpportunitiesClient({ initialReleases }: { initialReleases: EnrichedRelease[] }) {
  const [filters, setFilters] = useState<OpportunityFilters>({ sort: "opportunity" });
  const [showTicketProfit, setShowTicketProfit] = useState(false);

  const ranked = useMemo(() => filterOpportunities(initialReleases, filters), [initialReleases, filters]);
  const isTicketView = filters.category ? TICKET_SLUGS.has(filters.category) : ranked.some((r) => r.release_type === "ticket");

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
          <option value="TOP OPPORTUNITY">TOP OPPORTUNITY</option>
          <option value="MUST WATCH">MUST WATCH</option>
          <option value="HIGH PRIORITY">HIGH PRIORITY</option>
          <option value="PREPARE">PREPARE</option>
          <option value="WATCH">WATCH</option>
        </select>
        <select
          className="px-3 py-1.5 bg-titan-bg border border-titan-border rounded-lg text-xs"
          value={filters.sort ?? "opportunity"}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as OpportunityFilters["sort"] }))}
        >
          <option value="opportunity">Sort: Opportunity</option>
          <option value="roi">Sort: Net ROI</option>
          <option value="profit">Sort: Profit</option>
          <option value="date">Sort: Date</option>
          <option value="urgency">Sort: Urgency</option>
        </select>
        {isTicketView && (
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 px-2">
            <input type="checkbox" checked={showTicketProfit} onChange={(e) => setShowTicketProfit(e.target.checked)} />
            Toon profit/ROI (tickets)
          </label>
        )}
      </div>

      {isTicketView && !showTicketProfit && (
        <p className="text-[10px] text-zinc-500 px-1">
          Monitoring & marktdata — doorverkoop boven originele prijs is in België niet toegelaten. Profit/ROI verborgen voor tickets.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-titan-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-titan-surface text-zinc-500 uppercase text-[10px]">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Release</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Starts</th>
              <th className="p-2 text-right">Retail (EUR)</th>
              {(!isTicketView || showTicketProfit) && (
                <>
                  <th className="p-2 text-right">Est. Resale</th>
                  <th className="p-2 text-right">Net Profit</th>
                  <th className="p-2 text-right">NETTO</th>
                </>
              )}
              <th className="p-2 text-right">Liq.</th>
              <th className="p-2 text-right">Risk</th>
              <th className="p-2 text-right">Conf.</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => {
              const hideProfit = r.release_type === "ticket" && !showTicketProfit;
              const retailEur = r.retail_eur ?? (r.price_min != null ? toEur((r.price_min + (r.price_max ?? r.price_min)) / 2, r.currency) : null);
              return (
                <tr key={r.id} className="border-t border-titan-border hover:bg-white/[0.02]">
                  <td className="p-2 font-mono text-zinc-500">{i + 1}</td>
                  <td className="p-2 max-w-[220px]">
                    <Link href={`/dashboard/releases/${r.id}`} className="font-medium hover:text-titan-accent line-clamp-2 leading-snug" title={r.title}>
                      {r.title}
                    </Link>
                  </td>
                  <td className="p-2 text-zinc-500">{r.release_categories?.name ?? "—"}</td>
                  <td className="p-2 text-zinc-400 font-mono whitespace-nowrap">{formatDate(r.release_starts_at)}</td>
                  <td className="p-2 text-right font-mono" title={`Orig: ${r.currency} ${r.price_min}–${r.price_max}`}>
                    {formatEur(retailEur)}
                  </td>
                  {!hideProfit && (
                    <>
                      <td className="p-2 text-right font-mono text-green-400">
                        {r.estimated_resale_mid ? formatEur(r.resale_eur_mid) : "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-green-400">
                        {r.net_profit_mid_eur != null ? formatEur(r.net_profit_mid_eur) : "—"}
                      </td>
                      <td className="p-2 text-right font-mono text-titan-accent">
                        {r.net_roi_mid != null ? `${r.net_roi_mid}%` : "—"}
                      </td>
                    </>
                  )}
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
              );
            })}
          </tbody>
        </table>
      </div>
      {ranked.length === 0 && (
        <div className="text-center text-zinc-500 py-12">No opportunities match filters</div>
      )}
    </div>
  );
}
