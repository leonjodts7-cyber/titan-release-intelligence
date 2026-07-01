"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Plus, Trash2, TestTube } from "lucide-react";

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Watchlist {
  id: string;
  name: string;
  enabled: boolean;
  rules: Rule[];
}

const DEFAULT_WATCHLISTS: Watchlist[] = [
  {
    id: "1",
    name: "Nike Drops",
    enabled: true,
    rules: [{ id: "r1", field: "brand", operator: "equals", value: "Nike" }],
  },
  {
    id: "2",
    name: "Champions League",
    enabled: true,
    rules: [{ id: "r2", field: "league", operator: "contains", value: "Champions League" }],
  },
  {
    id: "3",
    name: "EXTREME Alerts",
    enabled: true,
    rules: [{ id: "r3", field: "priority_level", operator: "equals", value: "EXTREME" }],
  },
];

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState(DEFAULT_WATCHLISTS);
  const [testResult, setTestResult] = useState<string | null>(null);

  const testWatchlist = async (id: string) => {
    const res = await fetch("/api/watchlists/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlistId: id }),
    });
    const data = await res.json();
    setTestResult(data.message ?? JSON.stringify(data));
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Watchlists</h1>
            <p className="text-zinc-500 text-sm mt-1">Automated matching rules for releases</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" />
            New Watchlist
          </button>
        </div>

        {testResult && (
          <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm text-zinc-300">
            {testResult}
          </div>
        )}

        <div className="space-y-4">
          {watchlists.map((wl) => (
            <div key={wl.id} className="p-4 rounded-xl bg-titan-surface border border-titan-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">{wl.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${wl.enabled ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                    {wl.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => testWatchlist(wl.id)}
                    className="p-2 hover:bg-white/5 rounded-lg"
                    title="Test rules"
                  >
                    <TestTube className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-lg">
                    <Trash2 className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {wl.rules.map((rule) => (
                  <div key={rule.id} className="text-sm text-zinc-400 font-mono bg-titan-bg px-3 py-1.5 rounded">
                    {rule.field} {rule.operator} &quot;{rule.value}&quot;
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
