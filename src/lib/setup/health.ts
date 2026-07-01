import { getSupabaseClient, isSupabaseConfigured, isDemoMode } from "@/lib/supabase/client-factory";
import type { SetupHealth } from "@/types";

export type { SetupHealth } from "@/types";

export async function checkSetupHealth(): Promise<SetupHealth> {
  const errors: string[] = [];
  const demoMode = isDemoMode();
  const serviceRoleAvailable = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let supabaseConnected = false;
  let tablesFound = false;
  let seedDataFound = false;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error: pingError } = await supabase.from("releases").select("id", { count: "exact", head: true });
      supabaseConnected = !pingError;
      if (pingError) errors.push(`Supabase ping: ${pingError.message}`);
      else {
        tablesFound = true;
        const { count } = await supabase.from("releases").select("id", { count: "exact", head: true });
        seedDataFound = (count ?? 0) >= 5;
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Supabase connection failed");
    }
  } else if (!isSupabaseConfigured()) {
    errors.push("Demo mode: Supabase not configured — using mock data");
  }

  return {
    demoMode,
    gitBranch: "main",
    gitRemoteConfigured: false,
    gitRemoteInstructions: "git remote add origin <repo-url>\ngit push -u origin main",
    supabaseConnected,
    serviceRoleAvailable,
    tablesFound,
    seedDataFound,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    ticketmasterConfigured: Boolean(process.env.TICKETMASTER_API_KEY),
    rssFeedsConfigured: Boolean(process.env.RSS_FEED_URLS),
    errors,
  };
}
