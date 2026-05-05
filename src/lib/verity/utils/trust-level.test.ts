/**
 * Tests for the internal-float → external-trust-level mapping.
 * Locks the bucket boundaries — moving them changes regulator-
 * facing trust labels and is a wire-compat break.
 */

import { describe, it, expect } from "vitest";
import { toExternalTrust } from "./trust-level";

describe("toExternalTrust", () => {
  it("0.98 (Sentinel + cross-verify) → HIGH", () => {
    const r = toExternalTrust(0.98);
    expect(r.level).toBe("HIGH");
    expect(r.range).toBe("0.90–0.98");
    expect(r.description).toMatch(/Sentinel/);
  });

  it("0.92 (Sentinel without cross-verify) → HIGH (T1-H5 boundary)", () => {
    const r = toExternalTrust(0.92);
    expect(r.level).toBe("HIGH");
  });

  it("0.90 — exact lower bound of HIGH", () => {
    expect(toExternalTrust(0.9).level).toBe("HIGH");
  });

  it("0.89 — first MEDIUM step", () => {
    expect(toExternalTrust(0.89).level).toBe("MEDIUM");
  });

  it("0.7 — exact lower bound of MEDIUM", () => {
    expect(toExternalTrust(0.7).level).toBe("MEDIUM");
  });

  it("0.69 — first LOW step", () => {
    const r = toExternalTrust(0.69);
    expect(r.level).toBe("LOW");
    expect(r.range).toBe("0.50–0.69");
  });

  it("0.6 (manual declaration) → LOW", () => {
    expect(toExternalTrust(0.6).level).toBe("LOW");
  });

  it("0 → LOW (degraded but not invalid)", () => {
    expect(toExternalTrust(0).level).toBe("LOW");
  });
});
