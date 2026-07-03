import { describe, expect, it } from "vitest";
import { mapTicketmasterEventToDrops } from "./ticketmaster";

const FIXTURE = {
  id: "Z7r9jZ1Ad7p0k",
  name: "Coldplay — Antwerp",
  url: "https://www.ticketmaster.be/event/coldplay",
  dates: { start: { dateTime: "2026-09-15T19:00:00Z" } },
  sales: {
    presales: [
      { name: "Fanclub", startDateTime: "2026-08-01T08:00:00Z" },
      { name: "Amex", startDateTime: "2026-08-03T10:00:00Z" },
    ],
    public: { startDateTime: "2026-08-05T10:00:00Z" },
  },
  priceRanges: [{ min: 85, max: 250, currency: "EUR" }],
  classifications: [{ segment: { name: "Music" }, genre: { name: "Rock" } }],
  _embedded: {
    venues: [{ name: "De Kuip", city: { name: "Antwerp" }, country: { countryCode: "BE" } }],
  },
};

const NOW = new Date("2026-07-01T00:00:00Z").getTime();

describe("mapTicketmasterEventToDrops", () => {
  it("creates separate presale and public sale drops", () => {
    const drops = mapTicketmasterEventToDrops(FIXTURE, NOW);
    expect(drops.length).toBe(3);

    const presales = drops.filter((d) => d.drop_event_type === "presale");
    const publicSale = drops.find((d) => d.drop_event_type === "general_sale");

    expect(presales).toHaveLength(2);
    expect(presales[0].drop_at).toBe("2026-08-01T08:00:00.000Z");
    expect(presales[0].drop_time_confirmed).toBe(true);
    expect(presales[0].data_origin).toBe("api");
    expect(presales[0].external_source_id).toBe("Z7r9jZ1Ad7p0k-presale-0");

    expect(publicSale).toBeDefined();
    expect(publicSale!.drop_at).toBe("2026-08-05T10:00:00.000Z");
    expect(publicSale!.external_source_id).toBe("Z7r9jZ1Ad7p0k-public");
  });

  it("stores event date, venue and official URL separately from sale drops", () => {
    const drops = mapTicketmasterEventToDrops(FIXTURE, NOW);
    for (const d of drops) {
      expect(d.event_date).toBe("2026-09-15T19:00:00.000Z");
      expect(d.venue_name).toBe("De Kuip");
      expect(d.city_name).toBe("Antwerp");
      expect(d.source_url).toBe(FIXTURE.url);
      expect(d.price_min).toBe(85);
      expect(d.release_type).toBe("ticket");
    }
  });

  it("skips past sale moments", () => {
    const past = mapTicketmasterEventToDrops(FIXTURE, new Date("2026-09-01").getTime());
    expect(past).toHaveLength(0);
  });
});
