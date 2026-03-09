/**
 * Shield Risk Classifier Tests
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { classifyRisk } from "@/lib/shield/risk-classifier.server";
import type { RiskThresholds } from "@/lib/shield/types";

describe("classifyRisk", () => {
  it("classifies Pc >= 1e-3 as EMERGENCY", () => {
    expect(classifyRisk(1e-3, 10000)).toBe("EMERGENCY");
    expect(classifyRisk(5e-3, 10000)).toBe("EMERGENCY");
  });

  it("classifies Pc >= 1e-4 as HIGH", () => {
    expect(classifyRisk(1e-4, 10000)).toBe("HIGH");
    expect(classifyRisk(5e-4, 10000)).toBe("HIGH");
  });

  it("classifies Pc >= 1e-5 as ELEVATED", () => {
    expect(classifyRisk(1e-5, 10000)).toBe("ELEVATED");
    expect(classifyRisk(5e-5, 10000)).toBe("ELEVATED");
  });

  it("classifies Pc >= 1e-7 as MONITOR", () => {
    expect(classifyRisk(1e-7, 10000)).toBe("MONITOR");
    expect(classifyRisk(5e-6, 10000)).toBe("MONITOR");
  });

  it("classifies Pc < 1e-7 as INFORMATIONAL", () => {
    expect(classifyRisk(1e-8, 10000)).toBe("INFORMATIONAL");
    expect(classifyRisk(1e-10, 10000)).toBe("INFORMATIONAL");
  });

  it("miss < 100m overrides to EMERGENCY regardless of Pc", () => {
    expect(classifyRisk(1e-8, 80)).toBe("EMERGENCY");
  });

  it("miss < 500m overrides to at least HIGH", () => {
    expect(classifyRisk(1e-8, 300)).toBe("HIGH");
  });

  it("miss < 1000m overrides to at least ELEVATED", () => {
    expect(classifyRisk(1e-8, 800)).toBe("ELEVATED");
  });

  it("miss < 5000m overrides to at least MONITOR", () => {
    expect(classifyRisk(1e-10, 4000)).toBe("MONITOR");
  });

  it("Pc=5e-4 miss=80m → EMERGENCY (miss wins)", () => {
    expect(classifyRisk(5e-4, 80)).toBe("EMERGENCY");
  });

  it("Pc=1e-3 miss=10000m → EMERGENCY (Pc wins)", () => {
    expect(classifyRisk(1e-3, 10000)).toBe("EMERGENCY");
  });

  it("uses custom thresholds from CAConfig when provided", () => {
    const custom: RiskThresholds = {
      emergencyPc: 1e-2,
      highPc: 1e-3,
      elevatedPc: 1e-4,
      monitorPc: 1e-6,
      emergencyMiss: 50,
      highMiss: 200,
      elevatedMiss: 500,
      monitorMiss: 2000,
    };
    expect(classifyRisk(1e-3, 10000, custom)).toBe("HIGH");
  });

  it("Pc = 0 and large miss → INFORMATIONAL", () => {
    expect(classifyRisk(0, 100000)).toBe("INFORMATIONAL");
  });

  it("handles very small Pc values", () => {
    expect(classifyRisk(1e-20, 100000)).toBe("INFORMATIONAL");
  });
});
