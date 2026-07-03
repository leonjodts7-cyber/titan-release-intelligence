import { describe, expect, it } from "vitest";
import { dedupeIngestReleases } from "./ingest";
import type { NormalizedRelease } from "@/types";

function item(partial: Partial<NormalizedRelease> & { title: string }): NormalizedRelease {
  return {
    release_type: "product",
    status: "announced",
    source_url: "https://example.com",
    ...partial,
  };
}

describe("dedupeIngestReleases", () => {
  it("dedupes on external_source + external_source_id", () => {
    const a = item({
      title: "UCL Final — Voorverkoop",
      drop_at: "2026-05-30T18:00:00Z",
      external_source: "ticketmaster",
      external_source_id: "tm-1-presale-0",
    });
    const b = item({
      title: "UCL Final — Voorverkoop (duplicate)",
      drop_at: "2026-05-30T18:00:00Z",
      external_source: "ticketmaster",
      external_source_id: "tm-1-presale-0",
    });
    const out = dedupeIngestReleases([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("UCL Final — Voorverkoop");
  });

  it("keeps distinct drops with different external_source_id", () => {
    const a = item({
      title: "Coldplay — Voorverkoop",
      drop_at: "2026-06-01T18:00:00Z",
      external_source: "ticketmaster",
      external_source_id: "ev-presale-0",
    });
    const b = item({
      title: "Coldplay — Algemene verkoop",
      drop_at: "2026-06-05T10:00:00Z",
      external_source: "ticketmaster",
      external_source_id: "ev-public",
    });
    expect(dedupeIngestReleases([a, b])).toHaveLength(2);
  });
});
