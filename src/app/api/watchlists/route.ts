import { NextResponse } from "next/server";
import { getWatchlists } from "@/lib/data/notifications";

export async function GET() {
  const watchlists = await getWatchlists();
  return NextResponse.json({ watchlists, count: watchlists.length });
}
