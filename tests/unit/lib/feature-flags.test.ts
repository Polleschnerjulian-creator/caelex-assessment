/**
 * Feature-flags — tests for the "on unless explicitly off" kill-switch.
 *
 * Module-level env-reads make this tricky: process.env is snapshotted at
 * module eval time. We dynamically re-import with vi.resetModules() to
 * pick up different env values per test.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

async function freshlyLoad() {
  const mod = await import("@/lib/feature-flags");
  return {
    isFeatureEnabled: mod.isFeatureEnabled,
    isFeatureDisabled: mod.isFeatureDisabled,
  };
}

describe("isFeatureEnabled — new polarity (on by default)", () => {
  it("returns true when env var is unset", async () => {
    delete process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1;
    const { isFeatureEnabled } = await freshlyLoad();
    expect(isFeatureEnabled("provenance_v1")).toBe(true);
  });

  it("returns true when env var is empty string", async () => {
    process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = "";
    const { isFeatureEnabled } = await freshlyLoad();
    expect(isFeatureEnabled("provenance_v1")).toBe(true);
  });

  it.each(["1", "true", "yes", "on", "random value"])(
    "returns true for non-disabled value %s",
    async (val) => {
      process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = val;
      const { isFeatureEnabled } = await freshlyLoad();
      expect(isFeatureEnabled("provenance_v1")).toBe(true);
    },
  );

  it.each(["0", "false", "FALSE", "False", "no", "off", "disabled"])(
    "returns false for disabled value %s",
    async (val) => {
      process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = val;
      const { isFeatureEnabled } = await freshlyLoad();
      expect(isFeatureEnabled("provenance_v1")).toBe(false);
    },
  );

  it("is case + whitespace insensitive for disabled values", async () => {
    process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = "  OFF  ";
    const { isFeatureEnabled } = await freshlyLoad();
    expect(isFeatureEnabled("provenance_v1")).toBe(false);
  });
});

describe("isFeatureDisabled — explicit inverse", () => {
  it("returns false when env var is unset", async () => {
    delete process.env.NEXT_PUBLIC_FEAT_WORKFLOW_V2;
    const { isFeatureDisabled } = await freshlyLoad();
    expect(isFeatureDisabled("workflow_v2")).toBe(false);
  });

  it("returns true when env var is 0", async () => {
    process.env.NEXT_PUBLIC_FEAT_WORKFLOW_V2 = "0";
    const { isFeatureDisabled } = await freshlyLoad();
    expect(isFeatureDisabled("workflow_v2")).toBe(true);
  });
});

describe("each flag is independent", () => {
  it("disabling provenance_v1 does not disable workflow_v2", async () => {
    process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1 = "0";
    delete process.env.NEXT_PUBLIC_FEAT_WORKFLOW_V2;
    const { isFeatureEnabled } = await freshlyLoad();
    expect(isFeatureEnabled("provenance_v1")).toBe(false);
    expect(isFeatureEnabled("workflow_v2")).toBe(true);
  });
});
