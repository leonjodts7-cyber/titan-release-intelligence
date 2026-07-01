import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/data/notifications";

export async function GET() {
  const notifications = await getNotifications();
  return NextResponse.json({ notifications, count: notifications.length });
}
