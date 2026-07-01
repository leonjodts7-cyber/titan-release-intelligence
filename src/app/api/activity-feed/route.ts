import { NextRequest, NextResponse } from "next/server";
import { getActivityFeed } from "@/lib/data/activity-feed";

export async function GET() {
  const items = await getActivityFeed(50);
  return NextResponse.json({ items, timestamp: new Date().toISOString() });
}
