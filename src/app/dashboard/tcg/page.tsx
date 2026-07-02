import Link from "next/link";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases, sortByOpportunity } from "@/lib/data/enrich-releases";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { OpportunityBadge } from "@/components/releases/opportunity-badge";
import { PageTitle } from "@/components/ui/card";
import { formatEur, toEur } from "@/lib/money";
import { t } from "@/lib/i18n";

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
        <PageTitle title={t("tcg.title")} subtitle={t("tcg.subtitle", { count: tcg.length })} />

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
                      <th>{t("tcg.product")}</th>
                      <th className="text-right">MSRP</th>
                      <th className="text-right">{t("terms.market")}</th>
                      <th>{t("tcg.trend")}</th>
                      <th className="text-right">{t("tcg.gradePot")}</th>
                      <th className="text-right">{t("tcg.collector")}</th>
                      <th className="text-right">{t("tcg.scarcity")}</th>
                      <th className="text-right">{t("tcg.growth")}</th>
                      <th className="text-right">{t("terms.liquidityShort")}</th>
                      <th>{t("terms.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 8).map((r) => {
                      const msrpEur = r.msrp != null ? toEur(r.msrp, r.currency) : r.price_min != null ? toEur(r.price_min, r.currency) : null;
                      const marketEur = r.market_price != null
                        ? toEur(r.market_price, r.currency)
                        : r.current_market_price != null
                          ? toEur(r.current_market_price, r.currency)
                          : null;
                      return (
                        <tr key={r.id}>
                          <td>
                            <Link href={`/dashboard/drops/${r.id}`} className="hover:text-titan-accent line-clamp-2" title={r.title}>
                              {r.title}
                            </Link>
                          </td>
                          <td className="text-right font-mono tabular-nums" title={r.currency}>{formatEur(msrpEur)}</td>
                          <td className="text-right font-mono tabular-nums text-profit">{formatEur(marketEur)}</td>
                          <td>{r.tcg_trend ?? "—"}</td>
                          <td className="text-right tabular-nums">{r.grading_potential ?? "—"}</td>
                          <td className="text-right tabular-nums">{r.collector_score ?? "—"}</td>
                          <td className="text-right tabular-nums">{r.scarcity_score}</td>
                          <td className="text-right tabular-nums">{r.historical_growth_pct ?? "—"}%</td>
                          <td className="text-right tabular-nums">{Math.round(r.market_liquidity_score)}%</td>
                          <td><OpportunityBadge action={r.opportunity_action} compact showScore={false} /></td>
                        </tr>
                      );
                    })}
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
