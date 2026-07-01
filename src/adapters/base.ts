import type { NormalizedRelease } from "@/types";

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
  fetch(): Promise<unknown>;
  parse(raw: unknown): Promise<NormalizedRelease[]>;
  normalize(items: NormalizedRelease[]): NormalizedRelease[];
  validate(item: NormalizedRelease): boolean;
  run(): Promise<NormalizedRelease[]>;
}

export abstract class BaseSourceAdapter implements ISourceAdapter {
  abstract readonly name: string;
  abstract readonly config: SourceAdapterConfig;

  abstract fetch(): Promise<unknown>;
  abstract parse(raw: unknown): Promise<NormalizedRelease[]>;

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
    const raw = await this.fetch();
    const parsed = await this.parse(raw);
    const normalized = this.normalize(parsed);
    return normalized.filter((item) => this.validate(item));
  }

  protected getApiKey(): string | undefined {
    if (!this.config.apiKeyEnv) return undefined;
    return process.env[this.config.apiKeyEnv];
  }
}
