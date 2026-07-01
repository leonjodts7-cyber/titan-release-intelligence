"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CheckCircle, XCircle, RefreshCw, ArrowLeft, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertChannelsSetup } from "./alert-channels-setup";
import type { SetupHealth } from "@/types";

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-titan-border/50 last:border-0">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-sm", ok ? "text-green-400" : "text-red-400")}>
        {ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {ok ? "yes" : "no"}
      </span>
    </div>
  );
}

export default function SetupPage() {
  const [health, setHealth] = useState<SetupHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/setup");
    setHealth(await res.json());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/admin" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 mb-2">
              <ArrowLeft className="w-4 h-4" /> Admin
            </Link>
            <h1 className="text-2xl font-bold">Production Setup</h1>
            <p className="text-zinc-500 text-sm mt-1">Environment and integration health check</p>
          </div>
          <button onClick={refresh} disabled={loading} className="p-2 rounded-lg border border-titan-border hover:border-zinc-600">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {health && (
          <>
            <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Git</h2>
              <StatusRow label={`Branch: ${health.gitBranch}`} ok={true} />
              <StatusRow label="Remote configured" ok={health.gitRemoteConfigured} />
              {!health.gitRemoteConfigured && health.gitRemoteInstructions && (
                <pre className="mt-3 p-3 rounded-lg bg-titan-bg text-xs text-zinc-400 font-mono overflow-x-auto">
                  {health.gitRemoteInstructions}
                </pre>
              )}
            </section>

            <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Runtime</h2>
              <StatusRow label="Production mode (not demo)" ok={!health.demoMode} />
              <StatusRow label="Supabase connected" ok={health.supabaseConnected} />
              <StatusRow label="Service role available" ok={health.serviceRoleAvailable} />
              <StatusRow label="Tables found" ok={health.tablesFound} />
              <StatusRow label="Seed data found" ok={health.seedDataFound} />
            </section>

            <section className="p-4 rounded-xl bg-titan-surface border border-titan-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Integrations</h2>
              <StatusRow label="OpenAI configured" ok={health.openaiConfigured} />
              <StatusRow label="Discord configured" ok={health.discordConfigured} />
              <StatusRow label="Telegram configured" ok={health.telegramConfigured} />
              <StatusRow label="Resend configured" ok={health.resendConfigured} />
              <StatusRow label="Cron secret configured" ok={health.cronSecretConfigured} />
              <StatusRow label="Ticketmaster API key" ok={health.ticketmasterConfigured} />
              <StatusRow label="RSS feeds configured" ok={health.rssFeedsConfigured} />
              <StatusRow label="StockX API key" ok={health.stockxConfigured} />
              <StatusRow label="TCGplayer API key" ok={health.tcgplayerConfigured} />
              <StatusRow label="JustTCG API key" ok={health.justtcgConfigured} />
              <StatusRow label="PokéWallet API key" ok={health.pokewalletConfigured} />
              <StatusRow label="CardMarket API key" ok={health.cardmarketConfigured} />
            </section>

            <AlertChannelsSetup />

            {health.errors.length > 0 && (
              <section className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <h2 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Errors
                </h2>
                {health.errors.map((e, i) => (
                  <p key={i} className="text-sm text-red-300/80">{e}</p>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
