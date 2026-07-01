import { createServiceClient, createAnonServiceClient } from "@/lib/supabase/admin";

export interface SetupHealth {
  gitBranch: string;
  gitRemoteConfigured: boolean;
  gitRemoteInstructions: string | null;
  supabaseConnected: boolean;
  serviceRoleAvailable: boolean;
  tablesFound: boolean;
  seedDataFound: boolean;
  openaiConfigured: boolean;
  discordConfigured: boolean;
  telegramConfigured: boolean;
  resendConfigured: boolean;
  cronSecretConfigured: boolean;
  ticketmasterConfigured: boolean;
  rssFeedsConfigured: boolean;
  errors: string[];
}

export async function checkSetupHealth(): Promise<SetupHealth> {
  const errors: string[] = [];
  const serviceRoleAvailable = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const anonAvailable = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let supabaseConnected = false;
  let tablesFound = false;
  let seedDataFound = false;

  if (anonAvailable || serviceRoleAvailable) {
    try {
      const client = serviceRoleAvailable ? createServiceClient() : createAnonServiceClient();
      const { error: pingError } = await client.from("releases").select("id", { count: "exact", head: true });
      supabaseConnected = !pingError;
      if (pingError) errors.push(`Supabase ping: ${pingError.message}`);
      else tablesFound = true;

      if (supabaseConnected) {
        const { count } = await client.from("releases").select("id", { count: "exact", head: true });
        seedDataFound = (count ?? 0) >= 5;
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Supabase connection failed");
    }
  } else {
    errors.push("Missing NEXT_PUBLIC_SUPABASE_URL or keys in .env.local");
  }

  return {
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
