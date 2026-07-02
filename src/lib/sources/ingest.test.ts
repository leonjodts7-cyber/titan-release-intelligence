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
  it("merges same event from multiple sources on name+date+venue", () => {
    const a = item({
      title: "UCL Final",
      drop_at: "2026-05-30T18:00:00Z",
      venue_name: "Allianz Arena",
      external_source: "ticketmaster",
      external_source_id: "tm-1",
    });
    const b = item({
      title: "UCL Final",
      drop_at: "2026-05-30T20:00:00Z",
      venue_name: "Allianz Arena",
      external_source: "rss",
      external_source_id: "rss-1",
    });
    const out = dedupeIngestReleases([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].external_source).toBe("ticketmaster");
  });

  it("keeps distinct events with different venues", () => {
    const a = item({ title: "Show", drop_at: "2026-06-01T18:00:00Z", venue_name: "A" });
    const b = item({ title: "Show", drop_at: "2026-06-01T18:00:00Z", venue_name: "B" });
    expect(dedupeIngestReleases([a, b])).toHaveLength(2);
  });
});
