import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease, SourceAdapter } from "@/types";

abstract class MarketDataBaseAdapter extends BaseSourceAdapter {
  protected apiKeyEnv: string;

  constructor(name: string, id: string, apiKeyEnv: string, record?: SourceAdapter) {
    super(record);
    this.apiKeyEnv = apiKeyEnv;
    (this as { name: string }).name = name;
    (this as { config: { id: string; name: string; sourceType: string; apiKeyEnv: string } }).config = {
      id, name, sourceType: "api", apiKeyEnv,
    };
  }

  readonly name!: string;
  readonly config!: { id: string; name: string; sourceType: string; apiKeyEnv: string };

  async fetch(): Promise<unknown> {
    if (!process.env[this.apiKeyEnv]) {
      this.mode = "mock";
      this.log("warn", `${this.apiKeyEnv} missing — demo fallback`);
    } else {
      this.mode = "live";
    }
    return { items: [] as NormalizedRelease[] };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    return (raw as { items: NormalizedRelease[] }).items ?? [];
  }
}

export class StockXAdapter extends MarketDataBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("StockX", "stockx", "STOCKX_API_KEY", record);
  }
}

export class GoatAdapter extends MarketDataBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("GOAT", "goat", "GOAT_API_KEY", record);
  }
}

export class FlightClubAdapter extends MarketDataBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("Flight Club", "flightclub", "FLIGHTCLUB_API_KEY", record);
  }
}
