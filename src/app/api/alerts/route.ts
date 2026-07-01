import { NextResponse } from "next/server";
import { getAlertRules, getAlertEvents, evaluateAllAlerts } from "@/lib/data/alert-rules";
import { getReleases } from "@/lib/data/releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { notificationService } from "@/services/notification.service";
import { evaluateAlertTriggers } from "@/services/alert-dispatch.service";

export async function GET() {
  return NextResponse.json({
    rules: getAlertRules(),
    events: getAlertEvents(30),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.action === "evaluate") {
    const releases = enrichReleases(await getReleases());
    const triggered = evaluateAllAlerts(releases);
    const queued = evaluateAlertTriggers(releases);

    for (const event of triggered) {
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

    return NextResponse.json({ triggered: triggered.length, queued, events: triggered });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
