import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";

async function getDashboardHref(): Promise<string> {
  if (!isSupabaseConfigured()) return "/dashboard";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? "/dashboard" : "/login";
}

export default async function HomePage() {
  const dashboardHref = await getDashboardHref();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-titan-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-titan-accent" />
          <span className="font-bold text-xl tracking-tight">TITAN</span>
        </div>
        <Link
          href={dashboardHref}
          className="px-4 py-2 bg-titan-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Open Dashboard
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-titan-accent/10 border border-titan-accent/20 text-titan-accent text-sm mb-6">
            <Zap className="w-3 h-3" />
            Release Intelligence OS
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Bloomberg Terminal for Drops
          </h1>
          <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
            Automatically detect, score, and alert on high-demand releases — concerts, sports, sneakers, and more.
            Stay ahead with zero manual tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={dashboardHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-titan-accent hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
            >
              Launch Command Center
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 border border-titan-border hover:border-zinc-600 rounded-xl font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl w-full">
          {[
            { label: "Auto Detection", desc: "14+ source adapters" },
            { label: "AI Scoring", desc: "Demand & urgency engine" },
            { label: "Real-time Alerts", desc: "Discord, Telegram, email" },
            { label: "Smart Calendar", desc: "Never miss a drop" },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl bg-titan-surface border border-titan-border text-left">
              <div className="font-semibold text-sm">{item.label}</div>
              <div className="text-xs text-zinc-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
