import type { Release, NotificationChannel, PriorityLevel } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/admin";

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
    if (payload.channel === "in_app") {
      await this.saveNotification(payload, "sent");
      return true;
    }

    const configured = this.isChannelConfigured(payload.channel);
    if (!configured) return false;

    await this.saveNotification(payload, "pending");

    let success = false;
    switch (payload.channel) {
      case "discord":
        success = await this.sendDiscord(payload);
        break;
      case "telegram":
        success = await this.sendTelegram(payload);
        break;
      case "email":
        success = await this.sendEmail(payload);
        break;
    }

    return success;
  }

  async broadcastRelease(release: Release, reason: string, metadata?: Record<string, unknown>): Promise<Record<string, boolean>> {
    const body = this.buildBody(release, reason);
    const title = `[${release.priority_level}] ${release.title}`;
    const results: Record<string, boolean> = {};

    const channels: NotificationChannel[] = ["in_app", "discord", "telegram", "email"];
    for (const channel of channels) {
      if (channel !== "in_app" && !this.isChannelConfigured(channel)) {
        results[channel] = false;
        continue;
      }
      results[channel] = await this.send({
        title,
        body,
        releaseId: release.id,
        channel,
        metadata: { ...metadata, priority: release.priority_level, reason },
      });
    }

    return results;
  }

  async notifyRelease(release: Release, reason: string): Promise<void> {
    if (!this.shouldNotify(release.priority_level)) return;
    await this.broadcastRelease(release, reason);
  }

  async notifyWatchlistMatch(release: Release, watchlistName: string, eventType: string): Promise<void> {
    const reason = `Watchlist "${watchlistName}" matched on ${eventType.replace("_", " ")}`;
    await this.send({
      title: `[Watchlist] ${release.title}`,
      body: this.buildBody(release, reason),
      releaseId: release.id,
      channel: "in_app",
      metadata: { watchlist: watchlistName, event_type: eventType, dedup_key: `${watchlistName}:${release.id}:${eventType}` },
    });

    if (this.isChannelConfigured("discord")) {
      await this.send({ title: `[Watchlist] ${release.title}`, body: this.buildBody(release, reason), releaseId: release.id, channel: "discord" });
    }
  }

  async testChannel(channel: NotificationChannel): Promise<{ success: boolean; message: string }> {
    const payload: NotificationPayload = {
      title: "TITAN Test Alert",
      body: `Test notification from TITAN Release Intelligence OS (${channel}) at ${new Date().toISOString()}`,
      channel,
    };

    if (channel === "in_app") {
      await this.saveNotification(payload, "sent");
      return { success: true, message: "In-app notification saved" };
    }

    if (!this.isChannelConfigured(channel)) {
      return { success: false, message: `${channel} not configured — check .env.local` };
    }

    const success = await this.send(payload);
    return {
      success,
      message: success ? `${channel} test sent successfully` : `${channel} test failed`,
    };
  }

  isChannelConfigured(channel: NotificationChannel): boolean {
    switch (channel) {
      case "discord":
        return Boolean(process.env.DISCORD_WEBHOOK_URL);
      case "telegram":
        return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
      case "email":
        return Boolean(process.env.RESEND_API_KEY);
      default:
        return true;
    }
  }

  async processQueue(): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    const { data: pending } = await supabase
      .from("notifications")
      .select("*")
      .eq("status", "pending")
      .limit(50);

    if (!pending?.length) return 0;

    let sent = 0;
    for (const notification of pending) {
      const success = await this.deliverPending(notification);
      if (success) sent++;
    }
    return sent;
  }

  private buildBody(release: Release, reason: string): string {
    return `${reason}\n\nCategory: ${release.release_categories?.name ?? "—"}\nHype: ${release.hype_score} | Sellout: ${release.sellout_probability}%\nStart: ${release.release_starts_at ?? "TBA"}\nOfficial: ${release.official_url ?? "Pending"}`;
  }

  private async saveNotification(payload: NotificationPayload, status: "pending" | "sent"): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from("notifications").insert({
        user_id: payload.userId ?? null,
        release_id: payload.releaseId ?? null,
        channel: payload.channel,
        status,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata ?? {},
        sent_at: status === "sent" ? new Date().toISOString() : null,
      });
    } catch {
      // graceful fallback
    }
  }

  private async deliverPending(notification: {
    id: string;
    channel: NotificationChannel;
    title: string;
    body: string | null;
  }): Promise<boolean> {
    const payload = { title: notification.title, body: notification.body ?? "", channel: notification.channel };
    let success = false;

    switch (notification.channel) {
      case "discord":
        success = await this.sendDiscord(payload);
        break;
      case "telegram":
        success = await this.sendTelegram(payload);
        break;
      case "email":
        success = await this.sendEmail(payload);
        break;
      default:
        success = true;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("notifications").update({
        status: success ? "sent" : "failed",
        sent_at: success ? new Date().toISOString() : null,
        }).eq("id", notification.id);
      } catch {
        // ignore
      }
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
        text: `${payload.title}\n\n${payload.body}`,
      }),
    });
    return res.ok;
  }

  private async sendEmail(payload: NotificationPayload): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.RESEND_ALERT_EMAIL ?? "alerts@titan.io";
    if (!apiKey) return false;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "TITAN <onboarding@resend.dev>",
        to: [to],
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
