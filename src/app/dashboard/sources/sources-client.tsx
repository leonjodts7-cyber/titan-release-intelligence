"use client";

import { useState, useEffect } from "react";
import type { SourceAdapter } from "@/types";
import { Radio, Play, Pause, Clock } from "lucide-react";
import { scanSchedulerService } from "@/services/scan-scheduler.service";

function getNextScanIn(source: SourceAdapter): string {
  if (!source.last_scan_at) return `~${source.scan_frequency_minutes}m`;
  const last = new Date(source.last_scan_at).getTime();
  const next = last + source.scan_frequency_minutes * 60 * 1000;
  const diff = next - Date.now();
  if (diff <= 0) return "Due now";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function SourcesClient({ initialSources }: { initialSources: SourceAdapter[] }) {
  const [sources, setSources] = useState(initialSources);
  const [scanning, setScanning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSource = (id: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const scanSource = async (id: string, name: string) => {
    setScanning(id);
    try {
      const res = await fetch(`/api/sources/${id}/scan`, { method: "POST" });
      const data = await res.json();
      setLastResult(`${name}: found ${data.itemsFound}, created ${data.itemsCreated} (${data.mode ?? "unknown"} mode)`);
      setSources((prev) => prev.map((s) =>
        s.id === id ? { ...s, last_scan_at: new Date().toISOString(), last_error: null } : s
      ));
    } finally {
      setScanning(null);
    }
  };

  const enabledCount = sources.filter((s) => s.enabled).length;
  const failedCount = sources.filter((s) => s.enabled && s.last_error).length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-center">
          <div className="text-lg font-mono font-bold text-green-400">{enabledCount}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Sources online</div>
        </div>
        <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-center">
          <div className="text-lg font-mono font-bold text-titan-accent">15m</div>
          <div className="text-[10px] text-zinc-500 uppercase">Default cron interval</div>
        </div>
        <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-center">
          <div className={`text-lg font-mono font-bold ${failedCount > 0 ? "text-red-400" : "text-zinc-200"}`}>{failedCount}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Failed sources</div>
        </div>
      </div>

      {lastResult && (
        <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm font-mono mb-4">{lastResult}</div>
      )}
      <div className="space-y-2">
        {sources.map((source) => {
          const schedule = scanSchedulerService.getSchedule(source);
          return (
          <div key={source.id} className="flex items-center gap-4 p-4 rounded-xl bg-titan-surface border border-titan-border">
            <Radio className={`w-5 h-5 shrink-0 ${source.enabled && !source.last_error ? "text-green-500" : source.last_error ? "text-red-500" : "text-zinc-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm flex items-center gap-2">
                {source.name}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-titan-bg border border-titan-border text-zinc-500">{schedule.priority}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap gap-x-3">
                <span>Every {schedule.interval_minutes}min</span>
                <span>Reliability {source.reliability_score}%</span>
                {source.last_scan_at && <span>Last: {new Date(source.last_scan_at).toLocaleString()}</span>}
                <span className={`flex items-center gap-1 ${schedule.is_due ? "text-yellow-400" : "text-titan-accent"}`}>
                  <Clock className="w-3 h-3" />
                  Next: {getNextScanIn(source)}
                  {schedule.retry_backoff_minutes && ` (retry +${schedule.retry_backoff_minutes}m)`}
                </span>
                {source.last_error && <span className="text-yellow-500">Error: {source.last_error}</span>}
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
              <button onClick={() => toggleSource(source.id)} className="p-2 hover:bg-white/5 rounded-lg" title={source.enabled ? "Disable" : "Enable"}>
                {source.enabled ? <Pause className="w-4 h-4 text-zinc-400" /> : <Play className="w-4 h-4 text-green-500" />}
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}
