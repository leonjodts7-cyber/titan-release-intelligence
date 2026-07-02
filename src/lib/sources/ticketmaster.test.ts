import { describe, expect, it } from "vitest";
import { mapTicketmasterEvent } from "./ticketmaster";

const FIXTURE = {
  id: "Z7r9jZ1Ad7p0k",
  name: "Coldplay — Antwerp",
  url: "https://www.ticketmaster.be/event/coldplay",
  dates: { start: { dateTime: "2026-09-15T19:00:00Z" } },
  sales: {
    presales: [{ startDateTime: "2026-08-01T08:00:00Z" }],
    public: { startDateTime: "2026-08-05T10:00:00Z" },
  },
  priceRanges: [{ min: 85, max: 250, currency: "EUR" }],
  _embedded: {
    venues: [{ name: "De Kuip", city: { name: "Antwerp" }, country: { countryCode: "BE" } }],
  },
};

describe("mapTicketmasterEvent", () => {
  it("maps discovery event to NormalizedRelease", () => {
    const r = mapTicketmasterEvent(FIXTURE);
    expect(r.title).toBe("Coldplay — Antwerp");
    expect(r.external_source).toBe("ticketmaster");
    expect(r.external_source_id).toBe("Z7r9jZ1Ad7p0k");
    expect(r.drop_at).toBe("2026-09-15T19:00:00.000Z");
    expect(r.presale_starts_at).toBe("2026-08-01T08:00:00.000Z");
    expect(r.price_min).toBe(85);
    expect(r.venue_name).toBe("De Kuip");
    expect(r.buy_locations?.[0]?.url).toBe(FIXTURE.url);
    expect(r.release_type).toBe("ticket");
  });
});
