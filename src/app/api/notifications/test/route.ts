import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/services/notification.service";
import type { NotificationChannel } from "@/types";

const VALID_CHANNELS: NotificationChannel[] = ["in_app", "discord", "telegram", "email"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const channel = (body.channel ?? "in_app") as NotificationChannel;

  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const result = await notificationService.testChannel(channel);
  return NextResponse.json(result);
}
