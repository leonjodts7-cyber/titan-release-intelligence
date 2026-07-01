export type DeliveryStatus = "pending" | "sent" | "failed";

export interface AlertDelivery {
  id: string;
  channel_id: string;
  release_id: string;
  status: DeliveryStatus;
  message: string;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}

const deliveries: AlertDelivery[] = [];
const dedupeKey = (channelId: string, releaseId: string) => `${channelId}:${releaseId}`;

export function getPendingDeliveries(limit = 50): AlertDelivery[] {
  const now = Date.now();
  return deliveries
    .filter((d) =>
      d.status === "pending" ||
      (d.status === "failed" && d.next_retry_at && new Date(d.next_retry_at).getTime() <= now)
    )
    .slice(0, limit);
}

export function getRecentDeliveries(limit = 30): AlertDelivery[] {
  return [...deliveries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}

export function createDelivery(input: {
  channel_id: string;
  release_id: string;
  message: string;
}): AlertDelivery | null {
  const sixHoursAgo = Date.now() - 6 * 3600000;
  const recent = deliveries.find(
    (d) =>
      dedupeKey(d.channel_id, d.release_id) === dedupeKey(input.channel_id, input.release_id) &&
      new Date(d.created_at).getTime() > sixHoursAgo &&
      d.status !== "failed"
  );
  if (recent) return null;

  const delivery: AlertDelivery = {
    id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    channel_id: input.channel_id,
    release_id: input.release_id,
    status: "pending",
    message: input.message,
    attempts: 0,
    next_retry_at: null,
    last_error: null,
    sent_at: null,
    created_at: new Date().toISOString(),
  };
  deliveries.unshift(delivery);
  return delivery;
}

export function markDeliverySent(id: string): void {
  const d = deliveries.find((x) => x.id === id);
  if (d) {
    d.status = "sent";
    d.sent_at = new Date().toISOString();
  }
}

export function markDeliveryFailed(id: string, error: string): void {
  const d = deliveries.find((x) => x.id === id);
  if (!d) return;
  d.attempts += 1;
  d.last_error = error;
  if (d.attempts >= 5) {
    d.status = "failed";
    d.next_retry_at = null;
  } else {
    d.status = "pending";
    const backoffMs = Math.min(3600000, 30000 * 2 ** d.attempts);
    d.next_retry_at = new Date(Date.now() + backoffMs).toISOString();
  }
}
