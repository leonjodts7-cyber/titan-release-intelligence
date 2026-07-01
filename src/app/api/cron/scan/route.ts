import { NextRequest, NextResponse } from "next/server";
import { getSourceAdapters } from "@/lib/data/sources";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { evaluateAllAlerts } from "@/lib/data/alert-rules";
import { pipelineOrchestrator } from "@/services/pipeline.service";
import { notificationService } from "@/services/notification.service";
import { scanSchedulerService } from "@/services/scan-scheduler.service";

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

  const allAdapters = await getSourceAdapters(true);
  const adapters = scanSchedulerService.getDueSources(allAdapters);
  const toScan = adapters.length > 0 ? adapters : allAdapters.slice(0, 5);
  const results: Array<{ source: string; mode?: string; errors: string[]; itemsFound: number; itemsCreated: number; itemsUpdated: number }> = [];

  for (const adapter of toScan) {
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

  const releases = enrichReleases(await getReleases());
  const alertEvents = evaluateAllAlerts(releases);
  for (const event of alertEvents) {
    const release = releases.find((r) => r.id === event.release_id);
    if (release) {
      await notificationService.send({
        title: `[Alert] ${event.rule_name}`,
        body: event.message,
        releaseId: release.id,
        channel: "in_app",
        metadata: { alert_rule: event.rule_id, ...event.metadata },
      });
    }
  }

  const failed = results.filter((r) => r.errors.length > 0);
  return NextResponse.json({
    message: "Cron scan completed",
    scanned: results.length,
    due: adapters.length,
    total: allAdapters.length,
    failed: failed.length,
    alerts_triggered: alertEvents.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
