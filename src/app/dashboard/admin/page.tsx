"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Shield, Bell, RefreshCw, Merge, Plus } from "lucide-react";

export default function AdminPage() {
  const [testResult, setTestResult] = useState<string | null>(null);

  const testNotification = async () => {
    const res = await fetch("/api/notifications/test", { method: "POST" });
    const data = await res.json();
    setTestResult(data.message ?? JSON.stringify(data));
  };

  const triggerScan = async () => {
    const res = await fetch("/api/cron/scan", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? "demo"}` },
    });
    const data = await res.json();
    setTestResult(`Scan triggered: ${JSON.stringify(data)}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-titan-accent" />
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-zinc-500 text-sm">System management and overrides</p>
          </div>
        </div>

        {testResult && (
          <div className="p-3 rounded-lg bg-titan-surface border border-titan-border text-sm font-mono">
            {testResult}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Plus, label: "Add Release", desc: "Manually create a release" },
            { icon: Merge, label: "Merge Duplicates", desc: "Combine duplicate releases" },
            { icon: RefreshCw, label: "Force Rescore", desc: "Re-run AI scoring on all" },
            { icon: Bell, label: "Test Notification", desc: "Send test alert", action: testNotification },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex items-start gap-3 p-4 rounded-xl bg-titan-surface border border-titan-border hover:border-zinc-600 text-left transition-colors"
            >
              <item.icon className="w-5 h-5 text-titan-accent shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">System Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={triggerScan}
              className="px-4 py-2 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg text-sm"
            >
              Trigger Full Scan
            </button>
            <button
              onClick={testNotification}
              className="px-4 py-2 border border-titan-border hover:border-zinc-600 rounded-lg text-sm"
            >
              Test Notification
            </button>
          </div>
        </section>

        <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Audit Log</h2>
          <div className="space-y-2 text-sm font-mono">
            {[
              { action: "scan_completed", entity: "Nike SNKRS", time: "2m ago" },
              { action: "release_created", entity: "Nike Mercurial Limited", time: "2m ago" },
              { action: "notification_sent", entity: "EXTREME alert", time: "15m ago" },
              { action: "rescore", entity: "Taylor Swift Stadium Show", time: "1h ago" },
            ].map((log, i) => (
              <div key={i} className="flex justify-between text-zinc-400">
                <span>{log.action} → {log.entity}</span>
                <span className="text-zinc-600">{log.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
