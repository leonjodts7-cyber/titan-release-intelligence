import { getActivityFeed } from "@/lib/data/activity-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const items = await getActivityFeed(15);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ items, ts: Date.now() })}\n\n`));
      };

      await send();
      interval = setInterval(send, 15000);
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
