import { createAdapter } from "@/adapters";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";

export class SourceScannerService {
  async scanAdapter(adapterRecord: SourceAdapter): Promise<{
    items: NormalizedRelease[];
    error?: string;
  }> {
    const adapter = createAdapter(adapterRecord.name);
    if (!adapter) {
      return { items: [], error: `No adapter implementation for ${adapterRecord.name}` };
    }

    try {
      const items = await adapter.run();
      return { items };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown scan error";
      return { items: [], error: message };
    }
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
