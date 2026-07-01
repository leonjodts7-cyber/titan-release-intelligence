import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease } from "@/types";
import type { SourceAdapter } from "@/types";
import { TicketmasterAdapter } from "./ticketmaster";
import { NikeAdapter } from "./nike";
import { AdidasAdapter } from "./adidas";
import { RssAdapter } from "./rss";
import { SportsAdapter } from "./sports";
import { TcgPlayerAdapter, CardMarketAdapter, JustTcgAdapter, PokeWalletAdapter, PokemonRssAdapter } from "./tcg";
import { StockXAdapter, GoatAdapter, FlightClubAdapter } from "./market-data";

export {
  TicketmasterAdapter, NikeAdapter, AdidasAdapter, RssAdapter, SportsAdapter,
  TcgPlayerAdapter, CardMarketAdapter, JustTcgAdapter, PokeWalletAdapter, PokemonRssAdapter,
  StockXAdapter, GoatAdapter, FlightClubAdapter,
};
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

const SPORTS_NAMES = ["UEFA", "FIFA", "NFL", "NBA", "Premier League", "La Liga", "Formula 1", "UFC", "Wimbledon"];

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
    TCGplayer: (r) => new TcgPlayerAdapter(r),
    CardMarket: (r) => new CardMarketAdapter(r),
    JustTCG: (r) => new JustTcgAdapter(r),
    "PokéWallet": (r) => new PokeWalletAdapter(r),
    "Pokémon Center RSS": (r) => new PokemonRssAdapter(r),
    StockX: (r) => new StockXAdapter(r),
    GOAT: (r) => new GoatAdapter(r),
    "Flight Club": (r) => new FlightClubAdapter(r),
  };

  const factory = factories[name];
  return factory ? factory(record) : null;
}

export function getAllAdapterNames(): string[] {
  return [
    "Ticketmaster", "LiveNation", "Eventim", "AXS",
    "Nike SNKRS", "Adidas Confirmed",
    "UEFA", "FIFA", "NFL", "NBA", "Premier League", "La Liga", "Formula 1", "UFC",
    "TCGplayer", "CardMarket", "JustTCG", "PokéWallet", "Pokémon Center RSS",
    "StockX", "GOAT", "Flight Club",
    "RSS Feeds", "Official Websites", "Manual Sources",
  ];
}
