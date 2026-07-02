import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

describe("next.config redirects", () => {
  it("redirects legacy routes to v4 sections", async () => {
    const redirects = await nextConfig.redirects!();
    const map = Object.fromEntries(redirects.map((r) => [r.source, r.destination]));
    expect(map["/dashboard/opportunities"]).toBe("/dashboard/drops");
    expect(map["/dashboard/calendar"]).toBe("/dashboard/drops?view=calendar");
    expect(map["/dashboard/tcg"]).toBe("/dashboard/market?tab=tcg");
    expect(map["/dashboard/notifications"]).toBe("/dashboard/meldingen");
  });
});
