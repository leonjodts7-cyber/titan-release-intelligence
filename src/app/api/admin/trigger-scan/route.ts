import { NextResponse } from "next/server";
import { pipelineOrchestrator } from "@/services/pipeline.service";
import { getSourceAdapters } from "@/lib/data/sources";

export async function POST() {
  const adapters = await getSourceAdapters(true);
  const results = [];

  for (const adapter of adapters.slice(0, 3)) {
    const result = await pipelineOrchestrator.runScan(adapter);
    results.push({ source: adapter.name, ...result });
  }

  return NextResponse.json({ message: "Manual scan triggered", results });
}
