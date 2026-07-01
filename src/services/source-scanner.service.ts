import { createAdapter } from "@/adapters";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SourceScannerService {
  async scanAdapter(adapterRecord: SourceAdapter): Promise<{
    items: NormalizedRelease[];
    error?: string;
    mode?: "live" | "mock";
  }> {
    const adapter = createAdapter(adapterRecord.name, adapterRecord);
    if (!adapter) {
      return { items: [], error: `No adapter implementation for ${adapterRecord.name}` };
    }

    let lastError: string | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) await sleep(RETRY_DELAY_MS * attempt);
        const items = await adapter.run();
        return { items, mode: adapter.mode };
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown scan error";
        if (attempt < MAX_RETRIES) continue;
      }
    }

    return { items: [], error: lastError, mode: "mock" };
  }

  async scanAll(adapters: SourceAdapter[]): Promise<Map<string, NormalizedRelease[]>> {
    const results = new Map<string, NormalizedRelease[]>();
    const enabled = adapters.filter((a) => a.enabled);

    for (const adapter of enabled) {
      const { items } = await this.scanAdapter(adapter);
      results.set(adapter.id, items);
    }

    return results;
  }
}

export const sourceScannerService = new SourceScannerService();
