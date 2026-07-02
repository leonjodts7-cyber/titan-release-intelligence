import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/sources/ingest";

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
  const summary = await runIngest();
  return NextResponse.json(summary);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
