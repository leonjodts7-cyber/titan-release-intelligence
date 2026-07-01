import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";
import { adapterLog } from "./logger";

export interface SourceAdapterConfig {
  id: string;
  name: string;
  sourceType: string;
  baseUrl?: string;
  apiKeyEnv?: string;
}

export interface ISourceAdapter {
  readonly name: string;
  readonly config: SourceAdapterConfig;
  readonly mode: "live" | "mock";
  fetch(): Promise<unknown>;
  parse(raw: unknown): Promise<NormalizedRelease[]>;
  normalize(items: NormalizedRelease[]): NormalizedRelease[];
  validate(item: NormalizedRelease): boolean;
  run(): Promise<NormalizedRelease[]>;
}

export abstract class BaseSourceAdapter implements ISourceAdapter {
  abstract readonly name: string;
  abstract readonly config: SourceAdapterConfig;
  protected record?: SourceAdapter;
  mode: "live" | "mock" = "mock";

  constructor(record?: SourceAdapter) {
    this.record = record;
  }

  abstract fetch(): Promise<unknown>;
  abstract parse(raw: unknown): Promise<NormalizedRelease[]>;

  protected log(level: "info" | "warn" | "error" | "debug", message: string, metadata?: Record<string, unknown>) {
    adapterLog(this.name, level, message, this.mode, metadata);
  }

  normalize(items: NormalizedRelease[]): NormalizedRelease[] {
    return items.map((item) => ({
      ...item,
      title: item.title.trim(),
      slug: item.slug ?? item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      status: item.status ?? "announced",
      release_type: item.release_type ?? "other",
      currency: item.currency ?? "EUR",
      timezone: item.timezone ?? "UTC",
    }));
  }

  validate(item: NormalizedRelease): boolean {
    return Boolean(item.title && item.source_url);
  }

  async run(): Promise<NormalizedRelease[]> {
    this.log("info", "Starting adapter scan");
    try {
      const raw = await this.fetch();
      const parsed = await this.parse(raw);
      const normalized = this.normalize(parsed);
      const valid = normalized.filter((item) => this.validate(item));
      this.log("info", `Scan complete: ${valid.length} valid releases`, { found: parsed.length });
      return valid;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.log("error", `Scan failed: ${message}`);
      throw err;
    }
  }

  protected getApiKey(): string | undefined {
    if (!this.config.apiKeyEnv) return undefined;
    return process.env[this.config.apiKeyEnv];
  }

  protected getConfigUrls(): string[] {
    const config = this.record?.config as { monitor_urls?: string[] } | undefined;
    if (config?.monitor_urls?.length) return config.monitor_urls;
    if (this.config.baseUrl) return [this.config.baseUrl];
    return [];
  }
}
