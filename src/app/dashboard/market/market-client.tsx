"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { MarketCard } from "@/components/market/market-card";
import { PageTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/money";

export function MarketClient({ releases }: { releases: EnrichedRelease[] }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "tcg" ? "tcg" : "all";

  const tcg = releases.filter((r) => r.tcg_name || r.release_categories?.slug === "tcg-collectibles");
  const shown = tab === "tcg" ? tcg : releases;

  return (
    <>
      <PageTitle title={t("market.title")} subtitle={t("market.subtitle", { count: shown.length })} />

      <div className="flex gap-1 rounded-lg border border-titan-border p-0.5 w-fit text-xs mb-3">
        <Link
          href="/dashboard/market"
          className={cn(
            "px-3 py-1.5 rounded-md",
            tab === "all" ? "bg-titan-accent/15 text-titan-accent" : "text-titan-muted"
          )}
        >
          {t("terms.all")}
        </Link>
        <Link
          href="/dashboard/market?tab=tcg"
          className={cn(
            "px-3 py-1.5 rounded-md",
            tab === "tcg" ? "bg-titan-accent/15 text-titan-accent" : "text-titan-muted"
          )}
        >
          TCG
        </Link>
      </div>

      {tab === "tcg" && (
        <div className="overflow-x-auto rounded-xl border border-titan-border mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-titan-muted text-[10px] uppercase">
                <th className="text-left p-2">{t("tcg.product")}</th>
                <th className="text-right p-2">{t("terms.retail")}</th>
                <th className="text-right p-2">{t("terms.market")}</th>
                <th className="text-right p-2">{t("terms.netRoi")}</th>
                <th className="text-left p-2">{t("drops.colDrop")}</th>
              </tr>
            </thead>
            <tbody>
              {tcg.slice(0, 20).map((r) => (
                <tr key={r.id} className="border-t border-titan-border hover:bg-white/[0.02]">
                  <td className="p-2">
                    <Link href={`/dashboard/releases/${r.id}`} className="hover:text-titan-accent">
                      {r.title}
                    </Link>
                  </td>
                  <td className="p-2 text-right font-mono">{formatEur(r.retail_eur ?? r.msrp)}</td>
                  <td className="p-2 text-right font-mono text-profit">{formatEur(r.resale_eur_mid)}</td>
                  <td className="p-2 text-right font-mono">{r.net_roi_mid != null ? `${r.net_roi_mid}%` : "—"}</td>
                  <td className="p-2">
                    <Link href={`/dashboard/releases/${r.id}`} className="text-titan-accent text-[10px]">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {shown.slice(0, 18).map((r) => (
          <MarketCard key={r.id} release={r} />
        ))}
      </div>
    </>
  );
}
