/**
 * Feature-flags — tests for the truthy-env parser.
 *
 * Module-level env-reads make this tricky: process.env is snapshotted at
 * module eval time. We dynamically re-import with vi.resetModules() to
 * pick up different env values per test.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  // Restore env + clear module cache so the next test's import re-reads env.
  process.env = { ...originalEnv };
  vi.resetModules();
});

async function freshlyLoadIsFeatureEnabled() {
  const mod = await import("@/lib/feature-flags");
  return mod.isFeatureEnabled;
}

describe("isFeatureEnabled", () => {
  it("returns false when env var is unset", async () => {
    delete process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1;
    const isFeatureEnabled = await freshlyLoadIsFeatureEnabled();
    expect(isFeatureEnabled("provenance_v1")).toBe(false);
  });

  it("returns false when env var is empty string", async () => {
    process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = "";
    const isFeatureEnabled = await freshlyLoadIsFeatureEnabled();
    expect(isFeatureEnabled("provenance_v1")).toBe(false);
  });

  it.each(["1", "true", "TRUE", "True", "yes", "Yes", "on"])(
    "returns true for truthy value %s",
    async (val) => {
      process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = val;
      const isFeatureEnabled = await freshlyLoadIsFeatureEnabled();
      expect(isFeatureEnabled("provenance_v1")).toBe(true);
    },
  );

  it.each(["0", "false", "no", "off", "foobar", "null"])(
    "returns false for non-truthy value %s",
    async (val) => {
      process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = val;
      const isFeatureEnabled = await freshlyLoadIsFeatureEnabled();
      expect(isFeatureEnabled("provenance_v1")).toBe(false);
    },
  );
});
