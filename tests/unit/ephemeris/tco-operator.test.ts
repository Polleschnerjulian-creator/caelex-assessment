import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MODULE_REGISTRY,
  validateRegistry,
  getSafetyCriticalModules,
  getModuleWeights,
} from "@/lib/ephemeris/core/module-registry";
import { TCO_DEADLINES } from "@/data/tco-requirements";
import { BLOCK_DEFINITIONS } from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";
import {
  runTcoCommandLinkLoss,
  runTcoTrackingAccuracyDegradation,
  runTcoGroundStationFailure,
  runTcoAntennaFailure,
  runTcoTimingSynchronizationLoss,
  runTcoCommandAuthenticationBreach,
  runTcoNis2ClassificationChange,
  runTcoInteroperabilityFailure,
} from "@/lib/ephemeris/simulation/handlers/tco";
import type { SatelliteComplianceStateInternal } from "@/lib/ephemeris/core/types";

// ─── Test Baseline ──────────────────────────────────────────────────────────

const mockBaseline: SatelliteComplianceStateInternal = {
  noradId: "TCO-NETWORK-001",
  satelliteName: "ESTRACK Darmstadt",
  operatorId: "org-test",
  overallScore: 85,
  modules: {} as never,
  dataSources: {
    sentinel: { connected: false, lastPacket: null, packetsLast24h: 0 },
    verity: { attestations: 0, latestTrustLevel: null },
    assessment: { completedModules: 0, totalModules: 8, lastUpdated: null },
    celestrak: { lastTle: null, tleAge: null },
  },
  complianceHorizon: {
    daysUntilFirstBreach: 220,
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

describe("TCO Module Registry", () => {
  const tcoModules = MODULE_REGISTRY.TCO;

  it("has 8 modules", () => {
    expect(tcoModules).toHaveLength(8);
  });

  it("weights sum to 100", () => {
    const totalWeight = tcoModules.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("has no duplicate keys", () => {
    const keys = tcoModules.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("passes validation", () => {
    const result = validateRegistry("TCO");
    expect(result.valid).toBe(true);
  });

  it("has correct safety-critical modules", () => {
    const safetyCritical = getSafetyCriticalModules("TCO");
    expect(safetyCritical).toContain("operations_authorization");
    expect(safetyCritical).toContain("ground_infrastructure");
    expect(safetyCritical).toContain("cyber");
    expect(safetyCritical).toHaveLength(3);
  });

  it("returns weights as Record", () => {
    const weights = getModuleWeights("TCO");
    expect(weights.operations_authorization).toBe(18);
    expect(weights.ground_infrastructure).toBe(18);
    expect(weights.cyber).toBe(15);
    expect(weights.command_integrity).toBe(12);
    expect(weights.tracking_accuracy).toBe(10);
    expect(weights.insurance).toBe(10);
    expect(weights.interoperability).toBe(10);
    expect(weights.documentation).toBe(7);
  });

  it("all modules have non-empty regulationRefs", () => {
    for (const mod of tcoModules) {
      expect(mod.regulationRefs.length).toBeGreaterThan(0);
    }
  });

  it("all modules have non-empty requiredDataSources", () => {
    for (const mod of tcoModules) {
      expect(mod.requiredDataSources.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe("TCO Deadlines", () => {
  it("has 14 deadlines", () => {
    expect(TCO_DEADLINES).toHaveLength(14);
  });

  it("has no duplicate keys", () => {
    const keys = TCO_DEADLINES.map((d) => d.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("all deadlines have required fields", () => {
    for (const deadline of TCO_DEADLINES) {
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
    for (const deadline of TCO_DEADLINES) {
      expect(validFrequencies).toContain(deadline.frequency);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("TCO Scenario Handlers", () => {
  it("runTcoCommandLinkLoss permanent + fleet is CRITICAL", () => {
    const result = runTcoCommandLinkLoss(mockBaseline, {
      type: "TCO_COMMAND_LINK_LOSS",
      parameters: { duration: "permanent", affectedSatellites: 10 },
    });
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.projectedHorizon).toBe(0);
  });

  it("runTcoCommandLinkLoss temporary is HIGH", () => {
    const result = runTcoCommandLinkLoss(mockBaseline, {
      type: "TCO_COMMAND_LINK_LOSS",
      parameters: { duration: "temporary", affectedSatellites: 1 },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runTcoTrackingAccuracyDegradation severe is HIGH", () => {
    const result = runTcoTrackingAccuracyDegradation(mockBaseline, {
      type: "TCO_TRACKING_ACCURACY_DEGRADATION",
      parameters: { degradationLevel: "severe" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runTcoTrackingAccuracyDegradation moderate is MEDIUM", () => {
    const result = runTcoTrackingAccuracyDegradation(mockBaseline, {
      type: "TCO_TRACKING_ACCURACY_DEGRADATION",
      parameters: { degradationLevel: "moderate" },
    });
    expect(result.severityLevel).toBe("MEDIUM");
  });

  it("runTcoGroundStationFailure total + no redundancy is CRITICAL", () => {
    const result = runTcoGroundStationFailure(mockBaseline, {
      type: "TCO_GROUND_STATION_FAILURE",
      parameters: { failureType: "total", redundancy: "no" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runTcoAntennaFailure primary is HIGH", () => {
    const result = runTcoAntennaFailure(mockBaseline, {
      type: "TCO_ANTENNA_FAILURE",
      parameters: { antennaType: "primary" },
    });
    expect(result.severityLevel).toBe("HIGH");
    expect(result.costEstimate).toBeDefined();
    expect(result.costEstimate!.financialUsd).toBe(2_000_000);
  });

  it("runTcoTimingSynchronizationLoss is HIGH", () => {
    const result = runTcoTimingSynchronizationLoss(mockBaseline, {
      type: "TCO_TIMING_SYNCHRONIZATION_LOSS",
      parameters: {},
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runTcoCommandAuthenticationBreach is always CRITICAL", () => {
    const result = runTcoCommandAuthenticationBreach(mockBaseline, {
      type: "TCO_COMMAND_AUTHENTICATION_BREACH",
      parameters: {},
    });
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.projectedHorizon).toBe(0);
    expect(result.affectedRegulations).toHaveLength(2);
  });

  it("runTcoNis2ClassificationChange essential is HIGH", () => {
    const result = runTcoNis2ClassificationChange(mockBaseline, {
      type: "TCO_NIS2_CLASSIFICATION_CHANGE",
      parameters: { newClassification: "essential" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runTcoInteroperabilityFailure multi_protocol is HIGH", () => {
    const result = runTcoInteroperabilityFailure(mockBaseline, {
      type: "TCO_INTEROPERABILITY_FAILURE",
      parameters: { scope: "multi_protocol" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("TCO Block Definitions", () => {
  const tcoBlocks = BLOCK_DEFINITIONS.filter((b) =>
    b.operatorTypes?.includes("TCO"),
  );

  it("has 8 TCO blocks", () => {
    expect(tcoBlocks).toHaveLength(8);
  });

  it("all blocks have valid parameter schemas", () => {
    for (const block of tcoBlocks) {
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
    const ids = tcoBlocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all blocks have valid categories", () => {
    const validCategories = [
      "ground_operations",
      "command_events",
      "tco_regulatory",
    ];
    for (const block of tcoBlocks) {
      expect(validCategories).toContain(block.category);
    }
  });
});
