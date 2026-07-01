import type { OpportunityAction } from "@/services/opportunity-engine.service";

export type AlertChannelType = "telegram" | "discord";
export type AlertMinPriority = "TOP OPPORTUNITY" | "MUST WATCH" | "HIGH PRIORITY";

export interface AlertChannel {
  id: string;
  channel_type: AlertChannelType;
  label: string;
  telegram_chat_id: string | null;
  discord_webhook_url: string | null;
  min_priority: AlertMinPriority;
  enabled: boolean;
  created_at: string;
}

const PRIORITY_RANK: Record<AlertMinPriority, number> = {
  "TOP OPPORTUNITY": 4,
  "MUST WATCH": 3,
  "HIGH PRIORITY": 2,
};

let channelsCache: AlertChannel[] = [
  {
    id: "ch-demo-tg",
    channel_type: "telegram",
    label: "Telegram (demo)",
    telegram_chat_id: process.env.TELEGRAM_CHAT_ID ?? null,
    discord_webhook_url: null,
    min_priority: "MUST WATCH",
    enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-demo-dc",
    channel_type: "discord",
    label: "Discord (demo)",
    telegram_chat_id: null,
    discord_webhook_url: process.env.DISCORD_WEBHOOK_URL ?? null,
    min_priority: "HIGH PRIORITY",
    enabled: Boolean(process.env.DISCORD_WEBHOOK_URL),
    created_at: new Date().toISOString(),
  },
];

export function getAlertChannels(): AlertChannel[] {
  return [...channelsCache];
}

export function upsertAlertChannel(input: Omit<AlertChannel, "id" | "created_at"> & { id?: string }): AlertChannel {
  const channel: AlertChannel = {
    id: input.id ?? `ch-${Date.now()}`,
    channel_type: input.channel_type,
    label: input.label,
    telegram_chat_id: input.telegram_chat_id,
    discord_webhook_url: input.discord_webhook_url,
    min_priority: input.min_priority,
    enabled: input.enabled,
    created_at: new Date().toISOString(),
  };
  const idx = channelsCache.findIndex((c) => c.id === channel.id);
  if (idx >= 0) channelsCache[idx] = channel;
  else channelsCache.push(channel);
  return channel;
}

export function channelMatchesPriority(channel: AlertChannel, action: OpportunityAction): boolean {
  const actionRank =
    action === "TOP OPPORTUNITY" ? 4 :
    action === "MUST WATCH" ? 3 :
    action === "HIGH PRIORITY" ? 2 : 1;
  return actionRank >= PRIORITY_RANK[channel.min_priority];
}
