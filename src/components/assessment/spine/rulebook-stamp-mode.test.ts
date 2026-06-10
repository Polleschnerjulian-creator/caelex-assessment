/**
 * Task 4.4 — the entitlement-gated stale CTA (founder §11.2: living tier is
 * paid). Pure-function pinning so the gate cannot regress without a red test.
 */
import { describe, it, expect } from "vitest";
import { staleCtaMode } from "./rulebook-stamp-mode";

describe("staleCtaMode", () => {
  it("no banner when the snapshot matches the current rulebook", () => {
    expect(staleCtaMode("1.0.0", "1.0.0", true)).toBeNull();
    expect(staleCtaMode("1.0.0", "1.0.0", false)).toBeNull();
  });

  it("stale + entitled → rerun", () => {
    expect(staleCtaMode("1.0.0", "1.1.0", true)).toBe("rerun");
  });

  it("stale + NOT entitled → upgrade (never rerun — paid tier)", () => {
    expect(staleCtaMode("1.0.0", "1.1.0", false)).toBe("upgrade");
  });
});
