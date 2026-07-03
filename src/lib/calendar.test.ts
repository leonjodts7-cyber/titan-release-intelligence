import { describe, expect, it } from "vitest";
import { dropDayKey } from "@/lib/tiers";
import { getDropAt } from "@/lib/drop";
import type { EnrichedRelease } from "@/lib/data/enrich-releases";

describe("calendar day placement", () => {
  it("maps drop to Brussels calendar day", () => {
    const iso = "2026-07-15T10:00:00.000Z";
    const key = dropDayKey(iso);
    expect(key).toMatch(/2026-07-15/);
  });

  it("uses drop_at from release", () => {
    const r = {
      drop_at: "2026-08-01T14:00:00.000Z",
      release_starts_at: "2026-07-01T14:00:00.000Z",
    } as EnrichedRelease;
    expect(getDropAt(r)).toBe("2026-08-01T14:00:00.000Z");
  });
});
