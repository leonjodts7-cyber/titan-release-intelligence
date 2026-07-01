"use client";

import { useEffect, useState } from "react";
import type { AlertChannel, AlertMinPriority } from "@/lib/data/alert-channels";

export function AlertChannelsSetup() {
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [form, setForm] = useState({
    channel_type: "telegram" as "telegram" | "discord",
    label: "",
    telegram_chat_id: "",
    discord_webhook_url: "",
    min_priority: "MUST WATCH" as AlertMinPriority,
  });
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/alerts/channels");
    const data = await res.json();
    setChannels(data.channels ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    await fetch("/api/alerts/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setStatus("Channel saved");
    load();
  };

  const test = async (channelId: string) => {
    const res = await fetch("/api/alerts/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", channelId }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Test sent" : data.error ?? "Test failed");
  };

  return (
    <section className="p-4 rounded-xl bg-titan-surface border border-titan-border space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Alert Channels</h2>
      <p className="text-xs text-zinc-500">Telegram chat_id or Discord webhook — pings on TOP / MUST WATCH / score jumps.</p>

      <div className="grid md:grid-cols-2 gap-2 text-xs">
        <select value={form.channel_type} onChange={(e) => setForm((f) => ({ ...f, channel_type: e.target.value as "telegram" | "discord" }))} className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded">
          <option value="telegram">Telegram</option>
          <option value="discord">Discord</option>
        </select>
        <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Label" className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded" />
        {form.channel_type === "telegram" ? (
          <input value={form.telegram_chat_id} onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))} placeholder="Telegram chat_id" className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded md:col-span-2" />
        ) : (
          <input value={form.discord_webhook_url} onChange={(e) => setForm((f) => ({ ...f, discord_webhook_url: e.target.value }))} placeholder="Discord webhook URL" className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded md:col-span-2" />
        )}
        <select value={form.min_priority} onChange={(e) => setForm((f) => ({ ...f, min_priority: e.target.value as AlertMinPriority }))} className="px-2 py-1.5 bg-titan-bg border border-titan-border rounded">
          <option value="TOP OPPORTUNITY">TOP only</option>
          <option value="MUST WATCH">MUST WATCH+</option>
          <option value="HIGH PRIORITY">HIGH+</option>
        </select>
        <button onClick={save} className="px-3 py-1.5 bg-titan-accent text-white rounded">Save channel</button>
      </div>

      {status && <p className="text-[10px] text-zinc-400">{status}</p>}

      <div className="space-y-1">
        {channels.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-xs border-t border-titan-border/40 pt-2">
            <span>{c.label} · {c.channel_type} · min {c.min_priority}</span>
            <button onClick={() => test(c.id)} className="text-titan-accent hover:underline">Test</button>
          </div>
        ))}
      </div>
    </section>
  );
}
