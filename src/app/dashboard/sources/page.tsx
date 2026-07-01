"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Radio, Play, Pause, Settings } from "lucide-react";

const MOCK_SOURCES = [
  { id: "1", name: "Ticketmaster", enabled: true, frequency: 30, reliability: 85, lastScan: "15m ago", lastError: null },
  { id: "2", name: "Nike SNKRS", enabled: true, frequency: 15, reliability: 90, lastScan: "2m ago", lastError: null },
  { id: "3", name: "Adidas Confirmed", enabled: true, frequency: 15, reliability: 88, lastScan: "5m ago", lastError: null },
  { id: "4", name: "UEFA", enabled: true, frequency: 60, reliability: 92, lastScan: "1h ago", lastError: null },
  { id: "5", name: "NFL", enabled: true, frequency: 60, reliability: 95, lastScan: "1h ago", lastError: null },
  { id: "6", name: "Eventim", enabled: true, frequency: 60, reliability: 75, lastScan: "45m ago", lastError: "Rate limited" },
  { id: "7", name: "LiveNation", enabled: false, frequency: 30, reliability: 80, lastScan: "2d ago", lastError: null },
  { id: "8", name: "RSS Feeds", enabled: true, frequency: 30, reliability: 70, lastScan: "10m ago", lastError: null },
];

export default function SourcesPage() {
  const [sources, setSources] = useState(MOCK_SOURCES);

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const scanSource = async (id: string) => {
    await fetch(`/api/sources/${id}/scan`, { method: "POST" });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage source adapters and scan frequency</p>
        </div>

        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center gap-4 p-4 rounded-xl bg-titan-surface border border-titan-border">
              <Radio className={`w-5 h-5 shrink-0 ${source.enabled ? "text-green-500" : "text-zinc-600"}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{source.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Every {source.frequency}min · Reliability {source.reliability}% · Last scan {source.lastScan}
                  {source.lastError && <span className="text-yellow-500"> · {source.lastError}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scanSource(source.id)}
                  className="p-2 hover:bg-white/5 rounded-lg"
                  title="Scan now"
                >
                  <Play className="w-4 h-4 text-zinc-400" />
                </button>
                <button
                  onClick={() => toggleSource(source.id)}
                  className="p-2 hover:bg-white/5 rounded-lg"
                  title={source.enabled ? "Disable" : "Enable"}
                >
                  {source.enabled ? (
                    <Pause className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Play className="w-4 h-4 text-green-500" />
                  )}
                </button>
                <button className="p-2 hover:bg-white/5 rounded-lg">
                  <Settings className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
