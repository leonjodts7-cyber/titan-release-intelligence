import { NextRequest, NextResponse } from "next/server";
import { getAlertChannels, upsertAlertChannel, type AlertMinPriority } from "@/lib/data/alert-channels";
import { sendDiscordWebhook, sendTelegram } from "@/services/alert-dispatch.service";

export async function GET() {
  return NextResponse.json({ channels: getAlertChannels() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "test") {
    const channel = getAlertChannels().find((c) => c.id === body.channelId);
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    const text = "✅ TITAN test alert — your channel is configured correctly.";
    try {
      if (channel.channel_type === "telegram" && channel.telegram_chat_id) {
        await sendTelegram(channel.telegram_chat_id, text);
      } else if (channel.channel_type === "discord" && channel.discord_webhook_url) {
        await sendDiscordWebhook(channel.discord_webhook_url, text);
      } else {
        return NextResponse.json({ error: "Channel credentials missing" }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed" }, { status: 500 });
    }
  }

  const channel = upsertAlertChannel({
    id: body.id,
    channel_type: body.channel_type,
    label: body.label,
    telegram_chat_id: body.telegram_chat_id ?? null,
    discord_webhook_url: body.discord_webhook_url ?? null,
    min_priority: body.min_priority as AlertMinPriority,
    enabled: body.enabled ?? true,
  });

  return NextResponse.json({ channel });
}
