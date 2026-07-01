import { NextRequest, NextResponse } from "next/server";
import {
  addPosition, getPositions, getPortfolioStats, recordSale, updatePosition,
} from "@/lib/data/portfolio";
import { netPayout } from "@/lib/payout";

export async function GET() {
  const positions = getPositions();
  return NextResponse.json({ positions, stats: getPortfolioStats(positions) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "sell") {
    const payout = netPayout(body.sale_price_eur, body.platform ?? "stockx");
    const snap = recordSale(body.id, body.platform ?? "stockx", payout);
    if (!snap) return NextResponse.json({ error: "Position not found" }, { status: 404 });
    return NextResponse.json({ snapshot: snap, position: getPositions().find((p) => p.id === body.id) });
  }

  if (body.action === "update") {
    const pos = updatePosition(body.id, body.patch);
    if (!pos) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ position: pos });
  }

  const pos = addPosition({
    release_id: body.release_id ?? null,
    name: body.name,
    qty: body.qty ?? 1,
    buy_price_eur: body.buy_price_eur,
    buy_date: body.buy_date ?? new Date().toISOString().slice(0, 10),
    status: body.status ?? "holding",
    predicted_low_eur: body.predicted_low_eur ?? null,
    predicted_high_eur: body.predicted_high_eur ?? null,
  });

  return NextResponse.json({ position: pos });
}
