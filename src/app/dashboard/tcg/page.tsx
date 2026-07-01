import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases, getTcgOpportunities, sortByOpportunity } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { IntelStat } from "@/components/intelligence/intel-stat";
import { MiniChart } from "@/components/intelligence/mini-chart";
import { OpportunityBadge } from "@/components/releases/opportunity-badge";

const TCG_NAMES = ["Pokémon", "One Piece", "Magic", "Yu-Gi-Oh", "Lorcana", "Sports Cards"];

export const dynamic = "force-dynamic";

export default async function TcgPage() {
  const all = enrichReleases(await getReleases());
  const tcg = sortByOpportunity(all.filter((r) => r.tcg_name || r.release_categories?.slug === "tcg-collectibles"));

  const byTcg: Record<string, typeof tcg> = {};
  TCG_NAMES.forEach((n) => { byTcg[n] = tcg.filter((r) => r.tcg_name === n); });

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 space-y-4 max-w-[1600px]">
        <div>
          <h1 className="text-lg font-bold">TCG Intelligence</h1>
          <p className="text-[10px] text-zinc-500">{tcg.length} products · MSRP vs market · grading · collector demand</p>
        </div>

        {TCG_NAMES.map((name) => {
          const items = byTcg[name];
          if (!items.length) return null;
          return (
            <section key={name}>
              <h2 className="intel-section-title mb-2">{name} · {items.length}</h2>
              <div className="overflow-x-auto rounded-lg border border-titan-border">
                <table className="intel-table">
                  <thead>
                    <tr>
                      <th>Product</th><th>MSRP</th><th>Market</th><th>Trend</th><th>Grade Pot.</th><th>Collector</th><th>Scarcity</th><th>Growth</th><th>Liq.</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 8).map((r) => (
                      <tr key={r.id}>
                        <td><Link href={`/dashboard/releases/${r.id}`} className="hover:text-titan-accent">{r.title}</Link></td>
                        <td>${r.msrp ?? r.price_min}</td>
                        <td className="text-emerald-400">${r.market_price ?? r.current_market_price ?? "—"}</td>
                        <td>{r.tcg_trend ?? "—"}</td>
                        <td>{r.grading_potential ?? "—"}</td>
                        <td>{r.collector_score ?? "—"}</td>
                        <td>{r.scarcity_score}</td>
                        <td>{r.historical_growth_pct ?? "—"}%</td>
                        <td>{Math.round(r.market_liquidity_score)}%</td>
                        <td><OpportunityBadge action={r.opportunity_action} compact /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </IntelligenceLayout>
  );
}
