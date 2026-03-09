import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  computeNextStatus,
  shouldAutoEscalate,
  shouldAutoClose,
} from "@/lib/shield/conjunction-tracker.server";

describe("computeNextStatus", () => {
  it("NEW + MONITOR tier → MONITORING", () => {
    expect(computeNextStatus("NEW", "MONITOR")).toBe("MONITORING");
  });

  it("NEW + INFORMATIONAL tier → MONITORING", () => {
    expect(computeNextStatus("NEW", "INFORMATIONAL")).toBe("MONITORING");
  });

  it("NEW + ELEVATED tier → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("NEW", "ELEVATED")).toBe("ASSESSMENT_REQUIRED");
  });

  it("NEW + HIGH tier → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("NEW", "HIGH")).toBe("ASSESSMENT_REQUIRED");
  });

  it("NEW + EMERGENCY tier → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("NEW", "EMERGENCY")).toBe("ASSESSMENT_REQUIRED");
  });

  it("MONITORING + tier escalates to ELEVATED → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("MONITORING", "ELEVATED")).toBe(
      "ASSESSMENT_REQUIRED",
    );
  });

  it("MONITORING + tier stays MONITOR → MONITORING (no change)", () => {
    expect(computeNextStatus("MONITORING", "MONITOR")).toBe("MONITORING");
  });

  it("ASSESSMENT_REQUIRED + tier drops to MONITOR → stays ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("ASSESSMENT_REQUIRED", "MONITOR")).toBe(
      "ASSESSMENT_REQUIRED",
    );
  });

  it("ASSESSMENT_REQUIRED + tier drops to INFORMATIONAL → stays ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("ASSESSMENT_REQUIRED", "INFORMATIONAL")).toBe(
      "ASSESSMENT_REQUIRED",
    );
  });

  it("DECISION_MADE + any tier → stays DECISION_MADE", () => {
    expect(computeNextStatus("DECISION_MADE", "EMERGENCY")).toBe(
      "DECISION_MADE",
    );
  });

  it("MANEUVER_PLANNED + any tier → stays MANEUVER_PLANNED", () => {
    expect(computeNextStatus("MANEUVER_PLANNED", "MONITOR")).toBe(
      "MANEUVER_PLANNED",
    );
  });

  it("CLOSED + any tier → stays CLOSED", () => {
    expect(computeNextStatus("CLOSED", "EMERGENCY")).toBe("CLOSED");
  });
});

describe("shouldAutoEscalate", () => {
  it("returns true when TCA < 24h AND tier >= ELEVATED AND status < ASSESSMENT_REQUIRED", () => {
    const tca = new Date(Date.now() + 12 * 3600 * 1000);
    expect(shouldAutoEscalate("MONITORING", "ELEVATED", tca)).toBe(true);
  });

  it("returns true when TCA < 24h AND tier >= HIGH AND status is MONITORING", () => {
    const tca = new Date(Date.now() + 6 * 3600 * 1000);
    expect(shouldAutoEscalate("MONITORING", "HIGH", tca)).toBe(true);
  });

  it("returns false when TCA > 24h", () => {
    const tca = new Date(Date.now() + 48 * 3600 * 1000);
    expect(shouldAutoEscalate("MONITORING", "ELEVATED", tca)).toBe(false);
  });

  it("returns false when already at ASSESSMENT_REQUIRED", () => {
    const tca = new Date(Date.now() + 6 * 3600 * 1000);
    expect(shouldAutoEscalate("ASSESSMENT_REQUIRED", "HIGH", tca)).toBe(false);
  });

  it("returns false when tier is MONITOR", () => {
    const tca = new Date(Date.now() + 6 * 3600 * 1000);
    expect(shouldAutoEscalate("MONITORING", "MONITOR", tca)).toBe(false);
  });
});

describe("shouldAutoClose", () => {
  it("returns true when TCA passed + autoCloseHours elapsed + not EMERGENCY", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000);
    expect(shouldAutoClose("MONITORING", "MONITOR", tcaPast, 24)).toBe(true);
  });

  it("returns false when TCA has not passed", () => {
    const tcaFuture = new Date(Date.now() + 24 * 3600 * 1000);
    expect(shouldAutoClose("MONITORING", "MONITOR", tcaFuture, 24)).toBe(false);
  });

  it("returns false when TCA passed but within autoCloseHours", () => {
    const tcaRecent = new Date(Date.now() - 6 * 3600 * 1000);
    expect(shouldAutoClose("MONITORING", "MONITOR", tcaRecent, 24)).toBe(false);
  });

  it("returns false for EMERGENCY tier even if TCA passed", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000);
    expect(shouldAutoClose("MONITORING", "EMERGENCY", tcaPast, 24)).toBe(false);
  });

  it("returns false for already CLOSED events", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000);
    expect(shouldAutoClose("CLOSED", "MONITOR", tcaPast, 24)).toBe(false);
  });

  it("returns false for DECISION_MADE or later statuses", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000);
    expect(shouldAutoClose("DECISION_MADE", "MONITOR", tcaPast, 24)).toBe(
      false,
    );
    expect(shouldAutoClose("MANEUVER_PLANNED", "MONITOR", tcaPast, 24)).toBe(
      false,
    );
  });
});
