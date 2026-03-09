/**
 * Shield Ephemeris Data Adapter Tests
 *
 * Tests pure functions only: mapTierToStatus, computeCAComplianceFactor, getShieldStatus.
 * Database functions are tested in integration tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  mapTierToStatus,
  computeCAComplianceFactor,
  getShieldStatus,
} from "@/lib/ephemeris/data/shield-adapter";

// ─── mapTierToStatus ──────────────────────────────────────────────────────────

describe("mapTierToStatus", () => {
  it("maps EMERGENCY to NON_COMPLIANT", () => {
    expect(mapTierToStatus("EMERGENCY")).toBe("NON_COMPLIANT");
  });

  it("maps HIGH to WARNING", () => {
    expect(mapTierToStatus("HIGH")).toBe("WARNING");
  });

  it("maps ELEVATED to WARNING", () => {
    expect(mapTierToStatus("ELEVATED")).toBe("WARNING");
  });

  it("maps MONITOR to COMPLIANT", () => {
    expect(mapTierToStatus("MONITOR")).toBe("COMPLIANT");
  });

  it("maps INFORMATIONAL to COMPLIANT", () => {
    expect(mapTierToStatus("INFORMATIONAL")).toBe("COMPLIANT");
  });
});

// ─── computeCAComplianceFactor ────────────────────────────────────────────────

describe("computeCAComplianceFactor", () => {
  it("returns COMPLIANT with score 100 when no active events", () => {
    const result = computeCAComplianceFactor([]);

    expect(result.status).toBe("COMPLIANT");
    expect(result.score).toBe(100);
    expect(result.detail).toBe("No active conjunction events");
    expect(result.key).toBe("shield_ca");
    expect(result.label).toBe("Collision Avoidance");
  });

  it("returns NON_COMPLIANT with score 20 for EMERGENCY event without decision", () => {
    const result = computeCAComplianceFactor([
      {
        riskTier: "EMERGENCY",
        status: "ASSESSMENT_REQUIRED",
        tca: new Date("2026-04-01T00:00:00Z"),
        latestPc: 1e-3,
        decision: null,
      },
    ]);

    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.score).toBe(15); // 20 base - 5 for 1 undecided
    expect(result.detail).toBe("1 active event(s), 1 pending decision");
  });

  it("returns WARNING for HIGH event without decision", () => {
    const result = computeCAComplianceFactor([
      {
        riskTier: "HIGH",
        status: "MONITORING",
        tca: new Date("2026-04-01T00:00:00Z"),
        latestPc: 1e-4,
        decision: null,
      },
    ]);

    expect(result.status).toBe("WARNING");
    expect(result.score).toBe(55); // 60 base - 5 for 1 undecided
    expect(result.detail).toBe("1 active event(s), 1 pending decision");
  });

  it("returns COMPLIANT when all events have decisions", () => {
    const result = computeCAComplianceFactor([
      {
        riskTier: "HIGH",
        status: "DECISION_MADE",
        tca: new Date("2026-04-01T00:00:00Z"),
        latestPc: 1e-4,
        decision: "ACCEPT_RISK",
      },
      {
        riskTier: "ELEVATED",
        status: "DECISION_MADE",
        tca: new Date("2026-04-02T00:00:00Z"),
        latestPc: 1e-5,
        decision: "MONITOR",
      },
    ]);

    expect(result.status).toBe("COMPLIANT");
    expect(result.score).toBe(90); // max(70, 100 - 2*5) = max(70, 90) = 90
    expect(result.detail).toBe("2 event(s) with documented decisions");
  });

  it("uses worst tier when multiple undecided events exist", () => {
    const result = computeCAComplianceFactor([
      {
        riskTier: "EMERGENCY",
        status: "ASSESSMENT_REQUIRED",
        tca: new Date("2026-04-01T00:00:00Z"),
        latestPc: 1e-3,
        decision: null,
      },
      {
        riskTier: "HIGH",
        status: "MONITORING",
        tca: new Date("2026-04-02T00:00:00Z"),
        latestPc: 1e-4,
        decision: null,
      },
      {
        riskTier: "MONITOR",
        status: "MONITORING",
        tca: new Date("2026-04-03T00:00:00Z"),
        latestPc: 1e-7,
        decision: "ACCEPT_RISK",
      },
    ]);

    // Worst tier is EMERGENCY → NON_COMPLIANT, base 20, 2 undecided events → 20 - 10 = 10
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.score).toBe(10);
    expect(result.detail).toBe("3 active event(s), 2 pending decision");
  });
});

// ─── getShieldStatus ──────────────────────────────────────────────────────────

describe("getShieldStatus", () => {
  it("returns disconnected when config does not exist", () => {
    const result = getShieldStatus(0, false);

    expect(result.connected).toBe(false);
    expect(result.activeEvents).toBe(0);
    expect(result.lastPollAt).toBeNull();
    expect(result.source).toBe("Shield CDM Polling");
  });

  it("returns connected with no events when config exists but no events", () => {
    const result = getShieldStatus(0, true);

    expect(result.connected).toBe(true);
    expect(result.activeEvents).toBe(0);
    expect(result.lastPollAt).toBeNull();
    expect(result.source).toBe("Shield CDM Polling");
  });

  it("returns connected with event count when config exists and events present", () => {
    const result = getShieldStatus(5, true);

    expect(result.connected).toBe(true);
    expect(result.activeEvents).toBe(5);
    expect(result.lastPollAt).toBeNull();
    expect(result.source).toBe("Shield CDM Polling");
  });
});
