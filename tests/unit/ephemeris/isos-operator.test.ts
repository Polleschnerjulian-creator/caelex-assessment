import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MODULE_REGISTRY,
  validateRegistry,
  getSafetyCriticalModules,
  getModuleWeights,
} from "@/lib/ephemeris/core/module-registry";
import { ISOS_DEADLINES, PROXIMITY_THRESHOLDS } from "@/data/isos-requirements";
import { BLOCK_DEFINITIONS } from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";
import {
  runApproachAbort,
  runKeepoutZoneViolation,
  runRelativeNavFailure,
  runCaptureMechanismFailure,
  runTargetTumbleIncrease,
  runTargetDebrisCloud,
  runTargetNonCooperation,
  runIsosAuthorizationChange,
  runDebrisRemediationOrderIsos,
  runOosStandardChange,
} from "@/lib/ephemeris/simulation/handlers/isos";
import type { SatelliteComplianceStateInternal } from "@/lib/ephemeris/core/types";

// ─── Test Baseline ──────────────────────────────────────────────────────────

const mockBaseline: SatelliteComplianceStateInternal = {
  noradId: "ISOS-MISSION-001",
  satelliteName: "ClearSpace-1",
  operatorId: "org-test",
  overallScore: 75,
  modules: {} as never,
  dataSources: {
    sentinel: { connected: false, lastPacket: null, packetsLast24h: 0 },
    verity: { attestations: 0, latestTrustLevel: null },
    assessment: { completedModules: 0, totalModules: 8, lastUpdated: null },
    celestrak: { lastTle: null, tleAge: null },
  },
  complianceHorizon: {
    daysUntilFirstBreach: 180,
    firstBreachRegulation: null,
    firstBreachType: null,
    confidence: "MEDIUM",
  },
  activeAlerts: [],
  calculatedAt: new Date().toISOString(),
  dataFreshness: "NO_DATA",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

describe("ISOS Module Registry", () => {
  const isosModules = MODULE_REGISTRY.ISOS;

  it("has 8 modules", () => {
    expect(isosModules).toHaveLength(8);
  });

  it("weights sum to 100", () => {
    const totalWeight = isosModules.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("has no duplicate keys", () => {
    const keys = isosModules.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("passes validation", () => {
    const result = validateRegistry("ISOS");
    expect(result.valid).toBe(true);
  });

  it("has correct safety-critical modules", () => {
    const safetyCritical = getSafetyCriticalModules("ISOS");
    expect(safetyCritical).toContain("mission_authorization");
    expect(safetyCritical).toContain("proximity_operations");
    expect(safetyCritical).toContain("fuel");
    expect(safetyCritical).toHaveLength(3);
  });

  it("returns weights as Record", () => {
    const weights = getModuleWeights("ISOS");
    expect(weights.mission_authorization).toBe(18);
    expect(weights.proximity_operations).toBe(18);
    expect(weights.fuel).toBe(15);
    expect(weights.target_compliance).toBe(12);
    expect(weights.cyber).toBe(10);
    expect(weights.debris_risk).toBe(10);
    expect(weights.insurance).toBe(10);
    expect(weights.documentation).toBe(7);
  });

  it("all modules have non-empty regulationRefs", () => {
    for (const mod of isosModules) {
      expect(mod.regulationRefs.length).toBeGreaterThan(0);
    }
  });

  it("all modules have non-empty requiredDataSources", () => {
    for (const mod of isosModules) {
      expect(mod.requiredDataSources.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe("ISOS Deadlines", () => {
  it("has 12 deadlines", () => {
    expect(ISOS_DEADLINES).toHaveLength(12);
  });

  it("has no duplicate keys", () => {
    const keys = ISOS_DEADLINES.map((d) => d.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("all deadlines have required fields", () => {
    for (const deadline of ISOS_DEADLINES) {
      expect(deadline.key).toBeTruthy();
      expect(deadline.label).toBeTruthy();
      expect(deadline.regulationRef).toBeTruthy();
      expect(deadline.frequency).toBeTruthy();
      expect(deadline.leadTimeDays).toBeGreaterThan(0);
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(
        deadline.baseSeverity,
      );
    }
  });

  it("has valid frequency values", () => {
    const validFrequencies = ["once", "per_campaign", "annual", "biannual"];
    for (const deadline of ISOS_DEADLINES) {
      expect(validFrequencies).toContain(deadline.frequency);
    }
  });
});

describe("Proximity Thresholds", () => {
  it("has all required threshold values", () => {
    expect(PROXIMITY_THRESHOLDS.keepOutZoneDefault).toBe(10);
    expect(PROXIMITY_THRESHOLDS.warningDistance).toBe(5);
    expect(PROXIMITY_THRESHOLDS.criticalDistance).toBe(1);
    expect(PROXIMITY_THRESHOLDS.maxApproachVelocity).toBe(0.5);
    expect(PROXIMITY_THRESHOLDS.minAbortFuelPercent).toBe(20);
  });

  it("thresholds are ordered correctly", () => {
    expect(PROXIMITY_THRESHOLDS.criticalDistance).toBeLessThan(
      PROXIMITY_THRESHOLDS.warningDistance,
    );
    expect(PROXIMITY_THRESHOLDS.warningDistance).toBeLessThan(
      PROXIMITY_THRESHOLDS.keepOutZoneDefault,
    );
    expect(PROXIMITY_THRESHOLDS.maxApproachVelocity).toBeLessThan(
      PROXIMITY_THRESHOLDS.warningApproachVelocity,
    );
    expect(PROXIMITY_THRESHOLDS.warningApproachVelocity).toBeLessThan(
      PROXIMITY_THRESHOLDS.criticalApproachVelocity,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("ISOS Scenario Handlers", () => {
  it("runApproachAbort returns valid WhatIfResult", () => {
    const result = runApproachAbort(mockBaseline, {
      type: "ISOS_APPROACH_ABORT",
      parameters: { abortPhase: "final_approach", reason: "target_tumble" },
    });
    expect(result.scenario.type).toBe("ISOS_APPROACH_ABORT");
    expect(result.baselineHorizon).toBe(180);
    expect(result.projectedHorizon).toBeGreaterThanOrEqual(0);
    expect(result.horizonDelta).toBeLessThanOrEqual(0);
    expect(result.recommendation).toBeTruthy();
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runKeepoutZoneViolation always returns CRITICAL", () => {
    const result = runKeepoutZoneViolation(mockBaseline, {
      type: "ISOS_KEEPOUT_ZONE_VIOLATION",
      parameters: { violationDistanceKm: 0.5, duration: "sustained" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.affectedRegulations).toHaveLength(1);
    expect(result.affectedRegulations[0]!.statusAfter).toBe("NON_COMPLIANT");
  });

  it("runRelativeNavFailure severity depends on redundancy", () => {
    const totalFailure = runRelativeNavFailure(mockBaseline, {
      type: "ISOS_RELATIVE_NAV_FAILURE",
      parameters: { sensorType: "all", redundancy: "none" },
    });
    expect(totalFailure.severityLevel).toBe("CRITICAL");

    const partialFailure = runRelativeNavFailure(mockBaseline, {
      type: "ISOS_RELATIVE_NAV_FAILURE",
      parameters: { sensorType: "lidar", redundancy: "yes" },
    });
    expect(partialFailure.severityLevel).toBe("MEDIUM");
  });

  it("runCaptureMechanismFailure severity scales", () => {
    const noRetry = runCaptureMechanismFailure(mockBaseline, {
      type: "ISOS_CAPTURE_MECHANISM_FAILURE",
      parameters: { failureType: "no_grip", retryPossible: "no" },
    });
    expect(noRetry.severityLevel).toBe("CRITICAL");

    const retry = runCaptureMechanismFailure(mockBaseline, {
      type: "ISOS_CAPTURE_MECHANISM_FAILURE",
      parameters: { failureType: "partial_grip", retryPossible: "yes" },
    });
    expect(retry.severityLevel).toBe("MEDIUM");
  });

  it("runTargetTumbleIncrease chaotic is CRITICAL", () => {
    const result = runTargetTumbleIncrease(mockBaseline, {
      type: "ISOS_TARGET_TUMBLE_INCREASE",
      parameters: { tumbleRate: "chaotic" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runTargetDebrisCloud target breakup is CRITICAL", () => {
    const result = runTargetDebrisCloud(mockBaseline, {
      type: "ISOS_TARGET_DEBRIS_CLOUD",
      parameters: { source: "target_breakup", debrisDensity: "high" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runTargetNonCooperation is always CRITICAL", () => {
    const result = runTargetNonCooperation(mockBaseline, {
      type: "ISOS_TARGET_NON_COOPERATION",
      parameters: { reason: "commercial_dispute" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runIsosAuthorizationChange consent_revocation is CRITICAL", () => {
    const result = runIsosAuthorizationChange(mockBaseline, {
      type: "ISOS_AUTHORIZATION_CHANGE",
      parameters: { changeType: "consent_revocation" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runDebrisRemediationOrderIsos returns valid structure", () => {
    const result = runDebrisRemediationOrderIsos(mockBaseline, {
      type: "ISOS_DEBRIS_REMEDIATION_ORDER",
      parameters: { timelineDays: 180, targetCount: 3 },
    });
    expect(result.costEstimate).toBeDefined();
    expect(result.costEstimate!.financialUsd).toBe(45_000_000);
  });

  it("runOosStandardChange major_overhaul is HIGH", () => {
    const result = runOosStandardChange(mockBaseline, {
      type: "ISOS_OOS_STANDARD_CHANGE",
      parameters: { standard: "iso_24113_update", impact: "major_overhaul" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("ISOS Block Definitions", () => {
  const isosBlocks = BLOCK_DEFINITIONS.filter((b) =>
    b.operatorTypes?.includes("ISOS"),
  );

  it("has 10 ISOS blocks", () => {
    expect(isosBlocks).toHaveLength(10);
  });

  it("all blocks have valid parameter schemas", () => {
    for (const block of isosBlocks) {
      expect(block.id).toBeTruthy();
      expect(block.name).toBeTruthy();
      expect(block.scenarioType).toBeTruthy();
      expect(block.category).toBeTruthy();
      expect(block.icon).toBeTruthy();
      for (const param of block.parameterDefs) {
        expect(param.key).toBeTruthy();
        expect(param.label).toBeTruthy();
        expect(param.defaultValue).toBeDefined();
      }
    }
  });

  it("all blocks have unique ids", () => {
    const ids = isosBlocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all blocks have valid categories", () => {
    const validCategories = [
      "proximity_operations",
      "target_events",
      "isos_regulatory",
    ];
    for (const block of isosBlocks) {
      expect(validCategories).toContain(block.category);
    }
  });
});
