"use client";

import { useState } from "react";
import type { SourceAdapter } from "@/types";
import { Radio, Play, Pause } from "lucide-react";

export function SourcesClient({ initialSources }: { initialSources: SourceAdapter[] }) {
  const [sources, setSources] = useState(initialSources);
  const [scanning, setScanning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const toggleSource = (id: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const scanSource = async (id: string, name: string) => {
    setScanning(id);
    try {
      const res = await fetch(`/api/sources/${id}/scan`, { method: "POST" });
      const data = await res.json();
      setLastResult(`${name}: found ${data.itemsFound}, created ${data.itemsCreated} (${data.mode ?? "unknown"} mode)`);
    } finally {
      setScanning(null);
    }
  };

  return (
    <>
      {lastResult && (
        <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm font-mono">{lastResult}</div>
      )}
      <div className="space-y-2">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-4 p-4 rounded-xl bg-titan-surface border border-titan-border">
            <Radio className={`w-5 h-5 shrink-0 ${source.enabled && !source.last_error ? "text-green-500" : source.last_error ? "text-red-500" : "text-zinc-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{source.name}</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Every {source.scan_frequency_minutes}min · Reliability {source.reliability_score}%
                {source.last_scan_at && ` · Last scan ${new Date(source.last_scan_at).toLocaleString()}`}
                {source.last_error && <span className="text-yellow-500"> · {source.last_error}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scanSource(source.id, source.name)}
                disabled={scanning === source.id}
                className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-50"
                title="Scan now"
              >
                <Play className={`w-4 h-4 text-zinc-400 ${scanning === source.id ? "animate-pulse" : ""}`} />
              </button>
              <button onClick={() => toggleSource(source.id)} className="p-2 hover:bg-white/5 rounded-lg">
                {source.enabled ? <Pause className="w-4 h-4 text-zinc-400" /> : <Play className="w-4 h-4 text-green-500" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
