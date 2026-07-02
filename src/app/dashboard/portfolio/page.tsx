"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { formatEur, formatEurPrecise } from "@/lib/money";
import { netPayout, DEFAULT_FEE_PROFILES } from "@/lib/payout";
import type { Position } from "@/lib/data/portfolio";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Stats {
  invested: number;
  netProfit: number;
  medianRoi: number;
  winRate: number;
  best: Position | null;
  worst: Position | null;
}

interface ReleaseOption {
  id: string;
  title: string;
  category?: string;
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [releases, setReleases] = useState<ReleaseOption[]>([]);
  const [name, setName] = useState("");
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("1");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [sellTarget, setSellTarget] = useState<Position | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [salePlatform, setSalePlatform] = useState("stockx");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    const res = await fetch("/api/portfolio");
    const data = await res.json();
    setPositions(data.positions ?? []);
    setStats(data.stats ?? null);
  };

  useEffect(() => {
    load();
    fetch("/api/releases?limit=80")
      .then((r) => r.json())
      .then((d) => setReleases((d.releases ?? []).map((r: ReleaseOption & { release_categories?: { name: string } }) => ({
        id: r.id,
        title: r.title,
        category: r.release_categories?.name,
      }))))
      .catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    if (!name.trim()) return releases.slice(0, 8);
    const q = name.toLowerCase();
    return releases.filter((r) => r.title.toLowerCase().includes(q)).slice(0, 8);
  }, [name, releases]);

  const previewNet = useMemo(() => {
    const gross = Number(salePrice);
    if (!gross || !sellTarget) return null;
    return netPayout(gross, salePlatform);
  }, [salePrice, salePlatform, sellTarget]);

  const add = async () => {
    if (!name || !buyPrice) return;
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        release_id: releaseId,
        qty: Number(qty) || 1,
        buy_price_eur: Number(buyPrice),
        buy_date: buyDate,
      }),
    });
    setName("");
    setReleaseId(null);
    setCategory("");
    setQty("1");
    setBuyPrice("");
    setNote("");
    setMsg(t("portfolio.added"));
    load();
  };

  const confirmSell = async () => {
    if (!sellTarget || !salePrice) return;
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sell",
        id: sellTarget.id,
        sale_price_eur: Number(salePrice),
        platform: salePlatform,
      }),
    });
    setSellTarget(null);
    setSalePrice("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("portfolio.deleteConfirm"))) return;
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  };

  const positionPnl = (p: Position) => {
    if (p.status === "sold" && p.sale_price_eur != null) {
      const payout = netPayout(p.sale_price_eur, p.sale_platform ?? "stockx");
      const profit = payout - p.buy_price_eur * p.qty;
      const pct = p.buy_price_eur > 0 ? (profit / (p.buy_price_eur * p.qty)) * 100 : 0;
      return { profit, pct };
    }
    return null;
  };

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-4xl space-y-4">
        <PageTitle title={t("portfolio.title")} />

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="intel-card"><div className="intel-stat-label">{t("portfolio.invested")}</div><div className="font-mono tabular-nums">{formatEur(stats.invested)}</div></div>
            <div className="intel-card"><div className="intel-stat-label">{t("terms.netProfit")}</div><div className={cn("font-mono tabular-nums", stats.netProfit >= 0 ? "text-profit" : "text-loss")}>{formatEur(stats.netProfit)}</div></div>
            <div className="intel-card"><div className="intel-stat-label">{t("portfolio.medianRoi")}</div><div className="font-mono tabular-nums">{stats.medianRoi}%</div></div>
            <div className="intel-card"><div className="intel-stat-label">{t("terms.winRate")}</div><div className="font-mono tabular-nums">{stats.winRate}%</div></div>
            <div className="intel-card"><div className="intel-stat-label">{t("portfolio.bestFlip")}</div><div className="text-xs truncate text-profit" title={stats.best?.name}>{stats.best?.name ?? "—"}</div></div>
            <div className="intel-card"><div className="intel-stat-label">{t("portfolio.worstFlip")}</div><div className="text-xs truncate text-loss" title={stats.worst?.name}>{stats.worst?.name ?? "—"}</div></div>
          </div>
        )}

        <div className="intel-card space-y-3 relative">
          <div className="intel-section-title">{t("portfolio.addPosition")}</div>
          <div className="grid md:grid-cols-2 gap-2">
            <div className="relative">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setReleaseId(null); }}
                placeholder={t("portfolio.namePlaceholder")}
                className="w-full px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs"
                list="release-suggestions"
              />
              <datalist id="release-suggestions">
                {suggestions.map((r) => (
                  <option key={r.id} value={r.title} />
                ))}
              </datalist>
              {suggestions.length > 0 && name && !releaseId && (
                <div className="absolute z-10 top-full mt-1 w-full bg-titan-raised border border-titan-border rounded shadow-lg max-h-40 overflow-y-auto">
                  {suggestions.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-white/5"
                      onClick={() => { setName(r.title); setReleaseId(r.id); setCategory(r.category ?? ""); }}
                    >
                      {r.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("portfolio.category")} className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs" />
            <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder={t("portfolio.qty")} type="number" min={1} className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs" />
            <input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder={t("portfolio.buyPrice")} type="number" className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs" />
            <input value={buyDate} onChange={(e) => setBuyDate(e.target.value)} type="date" className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("portfolio.note")} className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs md:col-span-2" />
          </div>
          <button onClick={add} className="px-3 py-1.5 bg-titan-accent text-white rounded text-xs">{t("portfolio.add")}</button>
          {msg && <p className="text-caption text-profit">{msg}</p>}
        </div>

        <div className="space-y-1.5">
          {positions.length === 0 && <EmptyState message={t("portfolio.empty")} />}
          {positions.map((p) => {
            const pnl = positionPnl(p);
            return (
              <div key={p.id} className="intel-card flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium line-clamp-2" title={p.name}>{p.name}</div>
                  <div className="text-titan-muted">{p.status} · {t("portfolio.buyPrice")} {formatEur(p.buy_price_eur)} · {p.buy_date}</div>
                  {pnl && (
                    <div className={cn("font-mono tabular-nums", pnl.profit >= 0 ? "text-profit" : "text-loss")}>
                      {formatEurPrecise(pnl.profit)} ({pnl.pct >= 0 ? "+" : ""}{pnl.pct.toFixed(1)}%)
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {p.release_id && <Link href={`/dashboard/releases/${p.release_id}`} className="text-titan-accent">{t("portfolio.linkRelease")}</Link>}
                  {p.status !== "sold" && (
                    <button onClick={() => setSellTarget(p)} className="text-[10px] border border-titan-border px-2 py-1 rounded">{t("terms.sell")}</button>
                  )}
                  <button onClick={() => remove(p.id)} className="text-[10px] text-loss border border-titan-border px-2 py-1 rounded">{t("portfolio.delete")}</button>
                </div>
              </div>
            );
          })}
        </div>

        {sellTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSellTarget(null)}>
            <div className="bg-titan-surface border border-titan-border rounded-xl p-4 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-bold text-sm">{t("portfolio.sellTitle")}</h2>
              <p className="text-xs text-titan-muted line-clamp-2">{sellTarget.name}</p>
              <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder={t("portfolio.salePrice")} type="number" className="w-full px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs" />
              <select value={salePlatform} onChange={(e) => setSalePlatform(e.target.value)} className="w-full px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs">
                {DEFAULT_FEE_PROFILES.map((f) => (
                  <option key={f.platform} value={f.platform}>{f.platform}</option>
                ))}
              </select>
              <input value={saleDate} onChange={(e) => setSaleDate(e.target.value)} type="date" className="w-full px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs" />
              {previewNet != null && (
                <div className="text-xs font-mono tabular-nums text-profit">
                  {t("portfolio.netAfterFees")}: {formatEurPrecise(previewNet)}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setSellTarget(null)} className="px-3 py-1.5 text-xs border border-titan-border rounded">Annuleren</button>
                <button onClick={confirmSell} className="px-3 py-1.5 text-xs bg-titan-accent text-white rounded">{t("portfolio.confirmSell")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </IntelligenceLayout>
  );
}
