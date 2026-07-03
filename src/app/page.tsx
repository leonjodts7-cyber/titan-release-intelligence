import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";
import { t } from "@/lib/i18n";
import { isAuthEnabled } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";

async function getDashboardHref(): Promise<string> {
  if (!isAuthEnabled()) return "/dashboard";
  if (!isSupabaseConfigured()) return "/dashboard";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? "/dashboard" : "/login";
}

export default async function HomePage() {
  const dashboardHref = await getDashboardHref();
  const authOn = isAuthEnabled();

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
          {t("landing.openDashboard")}
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-titan-accent/10 border border-titan-accent/20 text-titan-accent text-sm mb-6">
            <Zap className="w-3 h-3" />
            {t("landing.badge")}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {t("landing.title")}
          </h1>
          <p className="text-xl text-zinc-400 mb-8 leading-relaxed">{t("landing.subtitle")}</p>
          <div className="flex justify-center">
            <Link
              href={dashboardHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-titan-accent hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
            >
              {t("landing.openDashboard")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {authOn && (
            <div className="flex justify-center mt-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-titan-border hover:border-zinc-600 rounded-xl font-medium transition-colors text-sm"
              >
                {t("landing.signIn")}
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl w-full">
          {(["detection", "scoring", "alerts", "calendar"] as const).map((key) => (
            <div key={key} className="p-4 rounded-xl bg-titan-surface border border-titan-border text-left">
              <div className="font-semibold text-sm">{t(`landing.features.${key}.label`)}</div>
              <div className="text-xs text-zinc-500 mt-1">{t(`landing.features.${key}.desc`)}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
