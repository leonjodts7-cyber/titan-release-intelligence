import { NextResponse } from "next/server";
import { notificationService } from "@/services/notification.service";
import { getMockReleases } from "@/lib/data/releases";

export async function POST() {
  const release = getMockReleases()[0];

  await notificationService.notifyRelease(
    release,
    "Test notification from TITAN admin panel",
    "in_app"
  );

  const discordSent = await notificationService.send({
    title: "TITAN Test Alert",
    body: "This is a test notification from the TITAN Release Intelligence OS.",
    channel: "discord",
  });

  return NextResponse.json({
    message: "Test notification sent",
    in_app: true,
    discord: discordSent,
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    email: Boolean(process.env.RESEND_API_KEY),
  });
}
