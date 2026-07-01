"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IntelligenceLayout } from "@/components/layout/intelligence-layout";
import { formatEur } from "@/lib/money";
import type { Position } from "@/lib/data/portfolio";

interface Stats {
  invested: number;
  netProfit: number;
  avgRoi: number;
  winRate: number;
  best: Position | null;
  worst: Position | null;
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [name, setName] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/portfolio");
    const data = await res.json();
    setPositions(data.positions ?? []);
    setStats(data.stats ?? null);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name || !buyPrice) return;
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, buy_price_eur: Number(buyPrice) }),
    });
    setName("");
    setBuyPrice("");
    setMsg("Position added");
    load();
  };

  const sell = async (id: string) => {
    const price = prompt("Sale price (EUR gross)?");
    if (!price) return;
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sell", id, sale_price_eur: Number(price), platform: "stockx" }),
    });
    load();
  };

  return (
    <IntelligenceLayout showFeed={false}>
      <div className="p-3 md:p-4 max-w-4xl space-y-4">
        <h1 className="text-lg font-bold">Portfolio P&L</h1>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="intel-card"><div className="text-[10px] text-zinc-500">Invested</div><div className="font-mono">{formatEur(stats.invested)}</div></div>
            <div className="intel-card"><div className="text-[10px] text-zinc-500">Net profit</div><div className="font-mono text-emerald-400">{formatEur(stats.netProfit)}</div></div>
            <div className="intel-card"><div className="text-[10px] text-zinc-500">Avg net ROI</div><div className="font-mono">{stats.avgRoi}%</div></div>
            <div className="intel-card"><div className="text-[10px] text-zinc-500">Win rate</div><div className="font-mono">{stats.winRate}%</div></div>
          </div>
        )}

        <div className="intel-card space-y-2">
          <div className="intel-section-title">Add position</div>
          <div className="flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs flex-1 min-w-[160px]" />
            <input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="Buy EUR" className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded text-xs w-24" />
            <button onClick={add} className="px-3 py-1.5 bg-titan-accent text-white rounded text-xs">Add</button>
          </div>
          {msg && <p className="text-[10px] text-emerald-400">{msg}</p>}
        </div>

        <div className="space-y-1.5">
          {positions.map((p) => (
            <div key={p.id} className="intel-card flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-zinc-500">{p.status} · Buy {formatEur(p.buy_price_eur)} · {p.buy_date}</div>
                {p.status === "sold" && p.sale_price_eur != null && (
                  <div className="text-emerald-400">Sold {formatEur(p.sale_price_eur)} via {p.sale_platform}</div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {p.release_id && <Link href={`/dashboard/releases/${p.release_id}`} className="text-titan-accent">Release</Link>}
                {p.status !== "sold" && (
                  <button onClick={() => sell(p.id)} className="text-[10px] border border-titan-border px-2 py-1 rounded">Mark sold</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </IntelligenceLayout>
  );
}
