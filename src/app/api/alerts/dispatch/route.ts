import { NextResponse } from "next/server";
import { getPendingDeliveries, markDeliveryFailed, markDeliverySent } from "@/lib/data/alert-deliveries";
import { getAlertChannels } from "@/lib/data/alert-channels";
import { sendDiscordWebhook, sendTelegram } from "@/services/alert-dispatch.service";

export async function POST() {
  const pending = getPendingDeliveries(25);
  const channels = getAlertChannels();
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const delivery of pending) {
    const channel = channels.find((c) => c.id === delivery.channel_id);
    if (!channel || !channel.enabled) {
      markDeliveryFailed(delivery.id, "Channel disabled or missing");
      results.push({ id: delivery.id, status: "failed", error: "Channel disabled" });
      continue;
    }

    try {
      if (channel.channel_type === "telegram" && channel.telegram_chat_id) {
        await sendTelegram(channel.telegram_chat_id, delivery.message);
      } else if (channel.channel_type === "discord" && channel.discord_webhook_url) {
        await sendDiscordWebhook(channel.discord_webhook_url, delivery.message);
      } else {
        throw new Error("Channel credentials missing");
      }
      markDeliverySent(delivery.id);
      results.push({ id: delivery.id, status: "sent" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      markDeliveryFailed(delivery.id, msg);
      results.push({ id: delivery.id, status: "retry", error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
