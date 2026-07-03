"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { t } from "@/lib/i18n";

export function RefreshIngestButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/refresh-ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "mislukt");
      const found = data.results?.reduce((s: number, r: { found: number }) => s + r.found, 0) ?? 0;
      setMsg(t("systeem.refreshDone", { found }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-titan-border text-xs hover:border-titan-accent disabled:opacity-50"
      >
        <RefreshCw className={cnIcon(loading)} />
        {t("systeem.refreshNow")}
      </button>
      {msg && <span className="text-[10px] text-titan-muted">{msg}</span>}
    </div>
  );
}

function cnIcon(loading: boolean) {
  return `w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`;
}
