"use client";

import { useState } from "react";
import type { Watchlist } from "@/types";
import { TestTube } from "lucide-react";

export function WatchlistsClient({ initialWatchlists }: { initialWatchlists: Watchlist[] }) {
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
    <>
      {testResult && (
        <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm text-zinc-300">
          {testResult}
        </div>
      )}
      <div className="space-y-4">
        {initialWatchlists.map((wl) => (
          <div key={wl.id} className="p-4 rounded-xl bg-titan-surface border border-titan-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">{wl.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${wl.enabled ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                  {wl.enabled ? "Active" : "Disabled"}
                </span>
              </div>
              <button
                onClick={() => testWatchlist(wl.id)}
                className="p-2 hover:bg-white/5 rounded-lg"
                title="Test rules against all releases"
              >
                <TestTube className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            {wl.description && <p className="text-xs text-zinc-500 mb-2">{wl.description}</p>}
            <div className="space-y-1">
              {(wl.watchlist_rules ?? []).map((rule) => (
                <div key={rule.id} className="text-sm text-zinc-400 font-mono bg-titan-bg px-3 py-1.5 rounded">
                  {rule.field} {rule.operator} &quot;{rule.value}&quot;
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
