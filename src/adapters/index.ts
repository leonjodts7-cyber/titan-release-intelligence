import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";
import { TicketmasterAdapter } from "./ticketmaster";
import { NikeAdapter } from "./nike";
import { AdidasAdapter } from "./adidas";
import { RssAdapter } from "./rss";
import { SportsAdapter } from "./sports";

export { TicketmasterAdapter, NikeAdapter, AdidasAdapter, RssAdapter, SportsAdapter };
export { adapterLog, getAdapterLogs } from "./logger";

export class ManualAdapter extends BaseSourceAdapter {
  readonly name = "Manual Sources";
  readonly config = { id: "manual", name: "Manual Sources", sourceType: "manual" };

  constructor(record?: SourceAdapter) {
    super(record);
  }

  async fetch(): Promise<unknown> {
    this.mode = "mock";
    return { items: [] };
  }

  async parse(): Promise<NormalizedRelease[]> {
    return [];
  }
}

const SPORTS_NAMES = ["UEFA", "FIFA", "NFL", "NBA", "Premier League", "La Liga", "Formula 1"];

export function createAdapter(name: string, record?: SourceAdapter): BaseSourceAdapter | null {
  if (SPORTS_NAMES.includes(name)) {
    return new SportsAdapter(name, record);
  }

  const factories: Record<string, (r?: SourceAdapter) => BaseSourceAdapter> = {
    Ticketmaster: (r) => new TicketmasterAdapter(r),
    LiveNation: (r) => new TicketmasterAdapter(r),
    Eventim: (r) => new TicketmasterAdapter(r),
    AXS: (r) => new TicketmasterAdapter(r),
    "Nike SNKRS": (r) => new NikeAdapter(r),
    "Adidas Confirmed": (r) => new AdidasAdapter(r),
    "RSS Feeds": (r) => new RssAdapter(r),
    "Official Websites": (r) => new RssAdapter(r),
    "Manual Sources": (r) => new ManualAdapter(r),
  };

  const factory = factories[name];
  return factory ? factory(record) : null;
}

export function getAllAdapterNames(): string[] {
  return [
    "Ticketmaster", "LiveNation", "Eventim", "AXS",
    "Nike SNKRS", "Adidas Confirmed",
    "UEFA", "FIFA", "NFL", "NBA", "Premier League", "La Liga", "Formula 1",
    "RSS Feeds", "Official Websites", "Manual Sources",
  ];
}
