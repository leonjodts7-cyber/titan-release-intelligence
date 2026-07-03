import { describe, it, expect } from "vitest";
import { isVisibleRelease } from "@/lib/drops/filter";

describe("isVisibleRelease", () => {
  it("shows on_sale items without drop_at", () => {
    const release = {
      id: "1",
      title: "FIFA Final",
      slug: "fifa-final",
      release_type: "ticket" as const,
      status: "on_sale" as const,
      drop_at: null,
      release_starts_at: null,
    };
    expect(isVisibleRelease(release as never)).toBe(true);
  });

  it("hides ended mock without drop", () => {
    const release = {
      id: "2",
      title: "Old",
      slug: "old",
      release_type: "product" as const,
      status: "ended" as const,
      drop_at: null,
    };
    expect(isVisibleRelease(release as never)).toBe(false);
  });
});
