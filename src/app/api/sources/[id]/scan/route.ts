import { NextRequest, NextResponse } from "next/server";
import { pipelineOrchestrator } from "@/services/pipeline.service";
import { getSourceAdapters } from "@/lib/data/sources";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adapters = await getSourceAdapters();
  const adapter = adapters.find((a) => a.id === id) ?? adapters.find((a) => a.name.toLowerCase().includes(id));

  if (!adapter) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const result = await pipelineOrchestrator.runScan(adapter);
  return NextResponse.json({
    message: "Scan completed",
    source: adapter.name,
    mode: result.mode,
    ...result,
  });
}
