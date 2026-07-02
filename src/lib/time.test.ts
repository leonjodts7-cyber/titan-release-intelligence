import { describe, it, expect } from "vitest";
import {
  formatDrop,
  formatRelative,
  formatCountdownLive,
  countdownUrgency,
  DISPLAY_TZ,
} from "@/lib/time";

describe("time.ts", () => {
  it("formats confirmed drop in Brussels", () => {
    // 2026-04-05 07:00 UTC = 09:00 CEST (Brussels summer)
    const result = formatDrop({
      dropAt: "2026-04-05T07:00:00.000Z",
      dropTimeConfirmed: true,
      hasTime: true,
    });
    expect(result).toMatch(/09:00/);
    expect(result).toMatch(/apr/);
  });

  it("shows unconfirmed time as ± with verwacht", () => {
    const result = formatDrop({
      dropAt: "2026-04-26T13:00:00.000Z",
      dropTimeConfirmed: false,
      hasTime: true,
    });
    expect(result).toContain("±");
    expect(result).toContain("verwacht");
  });

  it("shows tijd nog onbekend for date-only unconfirmed", () => {
    const result = formatDrop({
      dropAt: "2026-06-12T00:00:00.000Z",
      dropTimeConfirmed: false,
      hasTime: false,
    });
    expect(result).toContain("tijd nog onbekend");
  });

  it("formatRelative shows hours and minutes under 24h", () => {
    const now = new Date("2026-04-05T05:00:00.000Z").getTime();
    const drop = "2026-04-05T07:14:00.000Z";
    expect(formatRelative(drop, now)).toBe("over 2 u 14 m");
  });

  it("formatCountdownLive within 24h", () => {
    const now = new Date("2026-04-05T06:00:00.000Z").getTime();
    const drop = "2026-04-05T07:30:45.000Z";
    expect(formatCountdownLive(drop, now)).toBe("01:30:45");
  });

  it("countdownUrgency is urgent under 1 hour", () => {
    const now = Date.now();
    const drop = new Date(now + 30 * 60_000).toISOString();
    expect(countdownUrgency(drop, now)).toBe("urgent");
  });

  it("uses Europe/Brussels display timezone constant", () => {
    expect(DISPLAY_TZ).toBe("Europe/Brussels");
  });
});
