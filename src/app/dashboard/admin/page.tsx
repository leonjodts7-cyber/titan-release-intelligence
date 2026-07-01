"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Shield, Bell, RefreshCw, Settings, MessageSquare, Mail, Send } from "lucide-react";

type Channel = "in_app" | "discord" | "telegram" | "email";

export default function AdminPage() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const testChannel = async (channel: Channel) => {
    setLoading(channel);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      setTestResult(`${channel}: ${data.message} (${data.success ? "OK" : "FAILED"})`);
    } finally {
      setLoading(null);
    }
  };

  const triggerScan = async () => {
    setLoading("scan");
    try {
      const res = await fetch("/api/admin/trigger-scan", { method: "POST" });
      const data = await res.json();
      setTestResult(`Scan: ${data.message} — ${data.results?.length ?? 0} sources`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-titan-accent" />
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-zinc-500 text-sm">System management and overrides</p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/setup"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-titan-border rounded-lg hover:border-zinc-600"
          >
            <Settings className="w-4 h-4" />
            Setup Check
          </Link>
        </div>

        {testResult && (
          <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm font-mono">
            {testResult}
          </div>
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
              <button
                key={channel}
                onClick={() => testChannel(channel)}
                disabled={loading === channel}
                className="inline-flex items-center gap-2 px-4 py-2 border border-titan-border hover:border-zinc-600 rounded-lg text-sm disabled:opacity-50"
              >
                <Icon className="w-4 h-4" />
                Test {label}
              </button>
            ))}
          </div>
        </section>

        <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">System Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={triggerScan}
              disabled={loading === "scan"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading === "scan" ? "animate-spin" : ""}`} />
              Trigger Scan
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
