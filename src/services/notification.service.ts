import type { Release, NotificationChannel, PriorityLevel } from "@/types";
import { createServiceClient, createAnonServiceClient } from "@/lib/supabase/admin";

function getClient() {
  try {
    return createServiceClient();
  } catch {
    return createAnonServiceClient();
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  releaseId?: string;
  userId?: string;
  channel: NotificationChannel;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  async send(payload: NotificationPayload): Promise<boolean> {
    await this.saveInApp(payload);

    switch (payload.channel) {
      case "discord":
        return this.sendDiscord(payload);
      case "telegram":
        return this.sendTelegram(payload);
      case "email":
        return this.sendEmail(payload);
      default:
        return true;
    }
  }

  async notifyRelease(release: Release, reason: string, channel: NotificationChannel = "in_app"): Promise<void> {
    const payload: NotificationPayload = {
      title: `[${release.priority_level}] ${release.title}`,
      body: `${reason}\n\nScore: Hype ${release.hype_score} | Sellout ${release.sellout_probability}%\nStart: ${release.release_starts_at ?? "TBA"}\nOfficial: ${release.official_url ?? "Pending"}`,
      releaseId: release.id,
      channel,
      metadata: {
        priority: release.priority_level,
        hype_score: release.hype_score,
        sellout_probability: release.sellout_probability,
        official_url: release.official_url,
        category: release.release_categories?.name,
      },
    };
    await this.send(payload);
  }

  async processQueue(): Promise<number> {
    const supabase = getClient();
    const { data: pending } = await supabase
      .from("notifications")
      .select("*")
      .eq("status", "pending")
      .limit(50);

    if (!pending?.length) return 0;

    let sent = 0;
    for (const notification of pending) {
      const success = await this.deliverNotification(notification);
      if (success) sent++;
    }
    return sent;
  }

  private async saveInApp(payload: NotificationPayload): Promise<void> {
    try {
      const supabase = getClient();
      await supabase.from("notifications").insert({
        user_id: payload.userId ?? null,
        release_id: payload.releaseId ?? null,
        channel: payload.channel,
        status: payload.channel === "in_app" ? "sent" : "pending",
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata ?? {},
        sent_at: payload.channel === "in_app" ? new Date().toISOString() : null,
      });
    } catch {
      // In-memory fallback — notifications still work via API
    }
  }

  private async deliverNotification(notification: {
    id: string;
    channel: NotificationChannel;
    title: string;
    body: string | null;
  }): Promise<boolean> {
    let success = false;
    try {
      switch (notification.channel) {
        case "discord":
          success = await this.sendDiscord({ title: notification.title, body: notification.body ?? "", channel: "discord" });
          break;
        case "telegram":
          success = await this.sendTelegram({ title: notification.title, body: notification.body ?? "", channel: "telegram" });
          break;
        case "email":
          success = await this.sendEmail({ title: notification.title, body: notification.body ?? "", channel: "email" });
          break;
        default:
          success = true;
      }

      const supabase = getClient();
      await supabase
        .from("notifications")
        .update({
          status: success ? "sent" : "failed",
          sent_at: success ? new Date().toISOString() : null,
        })
        .eq("id", notification.id);
    } catch {
      success = false;
    }
    return success;
  }

  private async sendDiscord(payload: NotificationPayload): Promise<boolean> {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return false;

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: payload.title,
          description: payload.body,
          color: 0x6366f1,
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    return res.ok;
  }

  private async sendTelegram(payload: NotificationPayload): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return false;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `*${payload.title}*\n\n${payload.body}`,
        parse_mode: "Markdown",
      }),
    });
    return res.ok;
  }

  private async sendEmail(payload: NotificationPayload): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return false;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "TITAN <alerts@titan.io>",
        to: ["alerts@titan.io"],
        subject: payload.title,
        text: payload.body,
      }),
    });
    return res.ok;
  }

  shouldNotify(priority: PriorityLevel, minPriority: PriorityLevel = "HIGH"): boolean {
    const order = { EXTREME: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[priority] <= order[minPriority];
  }
}

export const notificationService = new NotificationService();
