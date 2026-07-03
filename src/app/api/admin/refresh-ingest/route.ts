import { NextResponse } from "next/server";
import { runIngest } from "@/lib/sources/ingest";

export async function POST() {
  const summary = await runIngest();
  return NextResponse.json({ ok: true, ...summary });
}
