"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Shield, Bell, RefreshCw, Settings, MessageSquare, Mail, Send, Download, Database } from "lucide-react";

type Channel = "in_app" | "discord" | "telegram" | "email";

export default function AdminPage() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const runAction = async (key: string, url: string, method = "POST", body?: object) => {
    setLoading(key);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (url.includes("/export")) {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `titan-export-${Date.now()}.csv`;
        a.click();
        setTestResult("CSV export downloaded");
        return;
      }
      const data = await res.json();
      setTestResult(JSON.stringify(data.message ?? data, null, 0).slice(0, 200));
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const testChannel = (channel: Channel) =>
    runAction(channel, "/api/notifications/test", "POST", { channel });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-titan-accent" />
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-zinc-500 text-sm">Deal execution intelligence controls</p>
            </div>
          </div>
          <Link href="/dashboard/admin/setup" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-titan-border rounded-lg hover:border-zinc-600">
            <Settings className="w-4 h-4" /> Setup
          </Link>
        </div>

        {testResult && (
          <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm font-mono">{testResult}</div>
        )}

        <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">Test Notifications</h2>
          <div className="flex flex-wrap gap-2">
            {([
              { channel: "in_app" as const, icon: Bell, label: "In-App" },
              { channel: "discord" as const, icon: MessageSquare, label: "Discord" },
              { channel: "telegram" as const, icon: Send, label: "Telegram" },
              { channel: "email" as const, icon: Mail, label: "Email" },
            ]).map(({ channel, icon: Icon, label }) => (
              <button key={channel} onClick={() => testChannel(channel)} disabled={loading === channel}
                className="inline-flex items-center gap-2 px-4 py-2 border border-titan-border hover:border-zinc-600 rounded-lg text-sm disabled:opacity-50">
                <Icon className="w-4 h-4" /> Test {label}
              </button>
            ))}
          </div>
        </section>

        <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">System Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => runAction("scan", "/api/admin/trigger-scan")} disabled={loading === "scan"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-titan-accent text-white rounded-lg text-sm disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading === "scan" ? "animate-spin" : ""}`} /> Trigger Scan
            </button>
            <button onClick={() => runAction("export", "/api/admin/export", "GET")} disabled={loading === "export"}
              className="inline-flex items-center gap-2 px-4 py-2 border border-titan-border rounded-lg text-sm disabled:opacity-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => runAction("setup", "/api/admin/setup", "GET")} disabled={loading === "setup"}
              className="inline-flex items-center gap-2 px-4 py-2 border border-titan-border rounded-lg text-sm disabled:opacity-50">
              <Database className="w-4 h-4" /> Refresh Health
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-3">Rescore/resale per release on detail page. No checkout automation.</p>
        </section>
      </div>
    </DashboardLayout>
  );
}
