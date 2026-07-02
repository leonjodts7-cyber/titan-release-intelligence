import { NextRequest, NextResponse } from "next/server";
import {
  addPosition,
  deletePosition,
  getPositions,
  getPortfolioStats,
  recordSale,
  updatePosition,
} from "@/lib/data/portfolio";
import { netPayout } from "@/lib/payout";

export async function GET() {
  const positions = getPositions();
  return NextResponse.json({ positions, stats: getPortfolioStats(positions) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "sell") {
    const gross = Number(body.sale_price_eur);
    const platform = body.platform ?? "stockx";
    const snap = recordSale(body.id, platform, gross);
    if (!snap) return NextResponse.json({ error: "Position not found" }, { status: 404 });
    const payout = netPayout(gross, platform);
    return NextResponse.json({
      snapshot: snap,
      net_payout_eur: payout,
      position: getPositions().find((p) => p.id === body.id),
    });
  }

  if (body.action === "update") {
    const pos = updatePosition(body.id, body.patch);
    if (!pos) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ position: pos });
  }

  if (body.action === "delete") {
    const ok = deletePosition(body.id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
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
