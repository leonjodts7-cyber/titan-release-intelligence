import { describe, it, expect } from "vitest";
import { isRealisticDropMinute, isRealisticDropTime, snapToSlot } from "@/lib/drop-times";
import { generateMockReleases } from "@/lib/data/mock-releases";
import { enrichReleases } from "@/lib/data/enrich-releases";
import { getDropAt } from "@/lib/drop";

describe("drop-times", () => {
  it("allows quarter-hour minutes only", () => {
    expect(isRealisticDropMinute(0)).toBe(true);
    expect(isRealisticDropMinute(15)).toBe(true);
    expect(isRealisticDropMinute(32)).toBe(false);
    expect(isRealisticDropMinute(47)).toBe(false);
  });

  it("snaps SNKRS to 09:00 Brussels", () => {
    const raw = "2026-07-04T06:32:00.000Z";
    const { iso, confirmed } = snapToSlot(raw, "snkrs", 0, true);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(iso));
    const h = parts.find((p) => p.type === "hour")?.value;
    const m = parts.find((p) => p.type === "minute")?.value;
    expect(h).toBe("09");
    expect(m).toBe("00");
    expect(confirmed).toBe(true);
    expect(isRealisticDropTime(iso)).toBe(true);
  });

  it("all mock releases have realistic drop times", () => {
    const releases = enrichReleases(generateMockReleases());
    for (const r of releases) {
      const at = getDropAt(r);
      if (at) expect(isRealisticDropTime(at)).toBe(true);
    }
  });
});
