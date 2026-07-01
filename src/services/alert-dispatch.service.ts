import type { EnrichedRelease } from "@/lib/data/enrich-releases";
import { getAlertChannels, channelMatchesPriority } from "@/lib/data/alert-channels";
import { createDelivery } from "@/lib/data/alert-deliveries";
import { formatEur } from "@/lib/money";
import { formatCountdown } from "@/lib/utils";
import type { OpportunityAction } from "@/services/opportunity-engine.service";

const priorScores = new Map<string, { score: number; action: OpportunityAction }>();

function buildAlertMessage(release: EnrichedRelease): string {
  const eventDate = release.release_starts_at ?? release.presale_starts_at;
  return [
    `🔔 ${release.opportunity_action}`,
    release.title,
    `Category: ${release.release_categories?.name ?? "—"}`,
    `Retail: ${formatEur(release.retail_eur)}`,
    `Net payout est.: ${formatEur(release.net_profit_mid_eur != null ? (release.retail_eur ?? 0) + release.net_profit_mid_eur : null)}`,
    `Net ROI: ${release.net_roi_mid ?? "—"}%`,
    `Countdown: ${formatCountdown(eventDate)}`,
    release.official_url ? `Link: ${release.official_url}` : "",
  ].filter(Boolean).join("\n");
}

export function evaluateAlertTriggers(releases: EnrichedRelease[]): number {
  const channels = getAlertChannels().filter((c) => c.enabled);
  let created = 0;

  for (const release of releases) {
    const prev = priorScores.get(release.id);
    const scoreJump = prev ? release.opportunity_score - prev.score : 0;
    const becameTop =
      release.opportunity_action === "TOP OPPORTUNITY" ||
      release.opportunity_action === "MUST WATCH";
    const wasTop =
      prev?.action === "TOP OPPORTUNITY" || prev?.action === "MUST WATCH";
    const shouldAlert = (becameTop && !wasTop) || scoreJump >= 15;

    priorScores.set(release.id, {
      score: release.opportunity_score,
      action: release.opportunity_action,
    });

    if (!shouldAlert) continue;

    const message = buildAlertMessage(release);
    for (const channel of channels) {
      if (!channelMatchesPriority(channel, release.opportunity_action)) continue;
      const delivery = createDelivery({
        channel_id: channel.id,
        release_id: release.id,
        message,
      });
      if (delivery) created += 1;
    }
  }

  return created;
}

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
}

export async function sendDiscordWebhook(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });
  if (!res.ok) throw new Error(`Discord webhook ${res.status}: ${await res.text()}`);
}
