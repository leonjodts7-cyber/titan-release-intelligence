"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { SourceIntelligence } from "@/lib/data/source-intelligence";

export function SourceScanActions({ sources }: { sources: SourceIntelligence[] }) {
  const [scanning, setScanning] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const scan = async (id: string) => {
    setScanning(id);
    try {
      const res = await fetch(`/api/sources/${id}/scan`, { method: "POST" });
      const data = await res.json();
      setMsg(`${id}: +${data.itemsCreated} created (${data.mode})`);
    } finally {
      setScanning(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {msg && <div className="w-full text-xs font-mono text-zinc-400 mb-2">{msg}</div>}
      {sources.filter((s) => s.status !== "OFFLINE").slice(0, 8).map((s) => (
        <button key={s.source_id} onClick={() => scan(s.source_id)} disabled={scanning === s.source_id}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] border border-titan-border rounded hover:border-zinc-600 disabled:opacity-50">
          <Play className="w-3 h-3" /> Scan {s.source_id}
        </button>
      ))}
    </div>
  );
}
