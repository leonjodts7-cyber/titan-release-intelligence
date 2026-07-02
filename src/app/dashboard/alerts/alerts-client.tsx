"use client";

import { useState } from "react";
import Link from "next/link";
import type { AlertRule, AlertEvent } from "@/services/alert-rules.service";
import { Bell, Play, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export function AlertsClient({
  initialRules,
  initialEvents,
}: {
  initialRules: AlertRule[];
  initialEvents: AlertEvent[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [events, setEvents] = useState(initialEvents);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async (id: string) => {
    const res = await fetch(`/api/alerts/${id}`, { method: "PATCH" });
    if (res.ok) {
      const data = await res.json();
      setRules((prev) => prev.map((r) => (r.id === id ? data.rule : r)));
    }
  };

  const evaluate = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate" }),
      });
      const data = await res.json();
      setMsg(`${data.triggered} alert(s) triggered`);
      if (data.events?.length) setEvents((prev) => [...data.events, ...prev].slice(0, 30));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={evaluate} disabled={running}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-titan-accent text-white rounded-lg text-xs disabled:opacity-50">
          <Play className={cn("w-3.5 h-3.5", running && "animate-pulse")} /> Evaluate Now
        </button>
        {msg && <span className="text-xs text-zinc-400 font-mono">{msg}</span>}
      </div>

      <section>
        <h2 className="intel-section-title mb-2">Alert Rules</h2>
        <div className="space-y-1.5">
          {rules.map((rule) => (
            <div key={rule.id} className="intel-card flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-xs font-medium flex items-center gap-2">
                  <Bell className="w-3 h-3 text-titan-accent" />
                  {rule.name}
                  <span className="text-[9px] text-zinc-600 font-mono">{rule.rule_type}</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Threshold {rule.threshold ?? rule.value ?? "—"} · Cooldown {rule.cooldown_minutes}m · {rule.channels.join(", ")}
                </div>
              </div>
              <button onClick={() => toggle(rule.id)}
                className={cn("p-1.5 rounded border text-xs", rule.enabled ? "border-emerald-500/30 text-emerald-400" : "border-zinc-600 text-zinc-500")}>
                <Power className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="intel-section-title mb-2">Triggered Events</h2>
        <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin">
          {events.length === 0 && <p className="text-xs text-zinc-600">No events yet — run Evaluate</p>}
          {events.map((e) => (
            <div key={e.id} className="p-2 rounded border border-titan-border/40 text-xs">
              <div className="flex justify-between gap-2">
                <Link href={`/dashboard/drops/${e.release_id}`} className="text-zinc-200 hover:text-titan-accent truncate">{e.release_title}</Link>
                <span className="text-[9px] text-zinc-600 shrink-0">{new Date(e.triggered_at).toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{e.rule_name} — {e.message}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
