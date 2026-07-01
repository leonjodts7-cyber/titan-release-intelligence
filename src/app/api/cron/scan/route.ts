import { NextRequest, NextResponse } from "next/server";
import { pipelineOrchestrator } from "@/services/pipeline.service";
import { getAllAdapterNames } from "@/adapters";
import type { SourceAdapter } from "@/types";

function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Demo mode
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];
  const adapterNames = getAllAdapterNames().slice(0, 5);

  for (let i = 0; i < adapterNames.length; i++) {
    const adapter: SourceAdapter = {
      id: String(i + 1),
      name: adapterNames[i],
      source_type: "mock",
      base_url: null,
      category: null,
      enabled: true,
      scan_frequency_minutes: 60,
      last_scan_at: null,
      last_success_at: null,
      last_error: null,
      reliability_score: 80,
      api_key_env: null,
      config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await pipelineOrchestrator.runScan(adapter);
    results.push({ source: adapter.name, ...result });
  }

  return NextResponse.json({
    message: "Cron scan completed",
    scanned: results.length,
    results,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
