import { NextRequest, NextResponse } from "next/server";
import { pipelineOrchestrator } from "@/services/pipeline.service";
import { getSourceAdapters } from "@/lib/data/sources";
import { notificationService } from "@/services/notification.service";

function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = request.headers.get("authorization");
  const bearer = auth?.replace("Bearer ", "");
  return bearer === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized — set CRON_SECRET" }, { status: 401 });
  }

  const adapters = await getSourceAdapters(true);
  const results: Array<{ source: string; mode?: string; errors: string[]; itemsFound: number; itemsCreated: number; itemsUpdated: number }> = [];

  for (const adapter of adapters) {
    try {
      const result = await pipelineOrchestrator.runScan(adapter);
      results.push({
        source: adapter.name,
        mode: result.mode,
        errors: result.errors,
        itemsFound: result.itemsFound,
        itemsCreated: result.itemsCreated,
        itemsUpdated: result.itemsUpdated,
      });
    } catch (err) {
      results.push({
        source: adapter.name,
        errors: [err instanceof Error ? err.message : "Unknown error"],
        itemsFound: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
      });
    }
  }

  await notificationService.processQueue();

  const failed = results.filter((r) => r.errors.length > 0);
  return NextResponse.json({
    message: "Cron scan completed",
    scanned: results.length,
    failed: failed.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
