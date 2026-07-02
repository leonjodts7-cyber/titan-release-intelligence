import { NextRequest, NextResponse } from "next/server";
import { rolloverPastDrops } from "@/lib/sources/ingest";
import { getMockReleases, invalidateMockCache } from "@/lib/data/releases";

function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  return bearer === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  invalidateMockCache();
  const dbCount = await rolloverPastDrops();

  return NextResponse.json({
    ended: dbCount,
    mockRegenerated: true,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  getMockReleases();
  return POST(request);
}
