import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAuthEnabled } from "@/lib/auth/config";

describe("auth config", () => {
  const original = process.env.AUTH_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_ENABLED;
    else process.env.AUTH_ENABLED = original;
  });

  it("defaults to disabled when AUTH_ENABLED unset", () => {
    delete process.env.AUTH_ENABLED;
    expect(isAuthEnabled()).toBe(false);
  });

  it("enabled only when AUTH_ENABLED=true", () => {
    process.env.AUTH_ENABLED = "true";
    expect(isAuthEnabled()).toBe(true);
    process.env.AUTH_ENABLED = "false";
    expect(isAuthEnabled()).toBe(false);
  });
});
