import { NextRequest, NextResponse } from "next/server";
import { pipelineOrchestrator } from "@/services/pipeline.service";
import { createAdapter, getAllAdapterNames } from "@/adapters";
import type { SourceAdapter } from "@/types";

const MOCK_ADAPTERS: Record<string, SourceAdapter> = Object.fromEntries(
  getAllAdapterNames().map((name, i) => [
    String(i + 1),
    {
      id: String(i + 1),
      name,
      source_type: "mock" as const,
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
    },
  ])
);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adapter = MOCK_ADAPTERS[id];

  if (!adapter) {
    const impl = createAdapter("Ticketmaster");
    if (!impl) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    const items = await impl.run();
    return NextResponse.json({
      message: "Scan completed (demo)",
      items_found: items.length,
      items_created: 0,
      items_updated: 0,
      items_skipped: items.length,
    });
  }

  const result = await pipelineOrchestrator.runScan(adapter);
  return NextResponse.json({
    message: "Scan completed",
    ...result,
  });
}
