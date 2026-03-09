/**
 * Shield Verity Integration Tests
 *
 * Tests the pure functions that determine when and how to create
 * Verity attestations for closed conjunction events.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  shouldCreateAttestation,
  buildAttestationPayload,
} from "@/lib/shield/verity-integration.server";

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_abc123",
    conjunctionId: "conj_001",
    noradId: "25544",
    threatNoradId: "99999",
    riskTier: "HIGH",
    status: "CLOSED",
    decision: "MANEUVER" as string | null,
    decisionBy: "user_ops1",
    decisionAt: new Date("2026-03-08T10:00:00Z"),
    decisionRationale: "Pc exceeds threshold; maneuver planned",
    peakPc: 1.2e-3,
    latestPc: 8.5e-4,
    latestMissDistance: 320,
    tca: new Date("2026-03-09T14:00:00Z"),
    closedAt: new Date("2026-03-09T16:00:00Z"),
    closedReason: "Maneuver executed and verified",
    cdmCount: 7,
    reportGenerated: true,
    ...overrides,
  };
}

// ─── shouldCreateAttestation ────────────────────────────────────────────────

describe("shouldCreateAttestation", () => {
  it("returns true for CLOSED status with decision and no existing attestation", () => {
    expect(shouldCreateAttestation("CLOSED", "MANEUVER", null)).toBe(true);
    expect(shouldCreateAttestation("CLOSED", "ACCEPT_RISK", null)).toBe(true);
    expect(shouldCreateAttestation("CLOSED", "MONITOR", null)).toBe(true);
    expect(shouldCreateAttestation("CLOSED", "COORDINATE", null)).toBe(true);
  });

  it("returns false when status is not CLOSED", () => {
    expect(shouldCreateAttestation("NEW", "MANEUVER", null)).toBe(false);
    expect(shouldCreateAttestation("MONITORING", "MANEUVER", null)).toBe(false);
    expect(
      shouldCreateAttestation("ASSESSMENT_REQUIRED", "MANEUVER", null),
    ).toBe(false);
    expect(shouldCreateAttestation("DECISION_MADE", "MANEUVER", null)).toBe(
      false,
    );
  });

  it("returns false when decision is null", () => {
    expect(shouldCreateAttestation("CLOSED", null, null)).toBe(false);
  });

  it("returns false when attestation already exists", () => {
    expect(
      shouldCreateAttestation("CLOSED", "MANEUVER", "att_existing_123"),
    ).toBe(false);
  });
});

// ─── buildAttestationPayload ────────────────────────────────────────────────

describe("buildAttestationPayload", () => {
  it("sets regulation_ref to ca_compliance", () => {
    const payload = buildAttestationPayload(makeEvent());
    expect(payload.regulation_ref).toBe("ca_compliance");
  });

  it("sets data_point to collision_avoidance", () => {
    const payload = buildAttestationPayload(makeEvent());
    expect(payload.data_point).toBe("collision_avoidance");
  });

  it("sets satellite_norad_id from event noradId", () => {
    const payload = buildAttestationPayload(makeEvent({ noradId: "12345" }));
    expect(payload.satellite_norad_id).toBe("12345");
  });

  it("sets result to COMPLIANT", () => {
    const payload = buildAttestationPayload(makeEvent());
    expect(payload.result).toBe("COMPLIANT");
  });

  it("includes key event fields in evidence", () => {
    const event = makeEvent();
    const payload = buildAttestationPayload(event);
    const evidence = payload.evidence;

    expect(evidence.conjunctionId).toBe("conj_001");
    expect(evidence.decision).toBe("MANEUVER");
    expect(evidence.peakPc).toBe(1.2e-3);
    expect(evidence.cdmCount).toBe(7);
    expect(evidence.threatNoradId).toBe("99999");
    expect(evidence.riskTier).toBe("HIGH");
    expect(evidence.decisionBy).toBe("user_ops1");
    expect(evidence.decisionRationale).toBe(
      "Pc exceeds threshold; maneuver planned",
    );
    expect(evidence.latestPc).toBe(8.5e-4);
    expect(evidence.latestMissDistance).toBe(320);
    expect(evidence.reportGenerated).toBe(true);
    expect(evidence.closedReason).toBe("Maneuver executed and verified");
  });

  it("sets expires_in_days to 365", () => {
    const payload = buildAttestationPayload(makeEvent());
    expect(payload.expires_in_days).toBe(365);
  });
});
