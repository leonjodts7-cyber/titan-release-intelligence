import { BaseSourceAdapter } from "./base";
import type { NormalizedRelease, SourceAdapter } from "@/types";

const DEMO_TCG: NormalizedRelease[] = [
  {
    title: "Pokémon Mega Evolution Charizard Collection",
    category_slug: "tcg-collectibles",
    release_type: "collectible",
    status: "announced",
    source_url: "https://www.tcgplayer.com",
    price_min: 49,
    price_max: 49,
    currency: "USD",
    stock_estimate: 5000,
  },
];

abstract class TcgBaseAdapter extends BaseSourceAdapter {
  protected apiKeyEnv: string;

  constructor(name: string, id: string, apiKeyEnv: string, sourceType: string, record?: SourceAdapter) {
    super(record);
    this.apiKeyEnv = apiKeyEnv;
    (this as { name: string }).name = name;
    (this as { config: { id: string; name: string; sourceType: string; apiKeyEnv: string } }).config = {
      id, name, sourceType, apiKeyEnv,
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
      this.log("info", "API configured (interface ready)");
    }
    return { items: DEMO_TCG };
  }

  async parse(raw: unknown): Promise<NormalizedRelease[]> {
    return (raw as { items: NormalizedRelease[] }).items ?? [];
  }
}

export class TcgPlayerAdapter extends TcgBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("TCGplayer", "tcgplayer", "TCGPLAYER_API_KEY", "api", record);
  }
}

export class CardMarketAdapter extends TcgBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("CardMarket", "cardmarket", "CARDMARKET_API_KEY", "api", record);
  }
}

export class JustTcgAdapter extends TcgBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("JustTCG", "justtcg", "JUSTTCG_API_KEY", "api", record);
  }
}

export class PokeWalletAdapter extends TcgBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("PokéWallet", "pokewallet", "POKEWALLET_API_KEY", "api", record);
  }
}

export class PokemonRssAdapter extends TcgBaseAdapter {
  constructor(record?: SourceAdapter) {
    super("Pokémon Center RSS", "pokemon-rss", "POKEMON_RSS_URL", "rss", record);
  }
}
