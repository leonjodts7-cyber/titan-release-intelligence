import { NextResponse } from "next/server";
import { getMonitoringSnapshot } from "@/lib/data/monitoring";

export async function GET() {
  return NextResponse.json(await getMonitoringSnapshot());
}
