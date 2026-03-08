import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MODULE_REGISTRY,
  validateRegistry,
  getSafetyCriticalModules,
  getModuleWeights,
} from "@/lib/ephemeris/core/module-registry";
import { LSO_DEADLINES } from "@/data/lso-requirements";
import { BLOCK_DEFINITIONS } from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";
import {
  runPadDamage,
  runRangeRadarFailure,
  runFtsSystemFailure,
  runWeatherStationOutage,
  runNoiseComplianceViolation,
  runEmissionLimitBreach,
  runWildlifeImpactAssessment,
  runSiteLicenseConditionChange,
  runAirspaceRestrictionChange,
  runNotamConflict,
} from "@/lib/ephemeris/simulation/handlers/lso";
import type { SatelliteComplianceStateInternal } from "@/lib/ephemeris/core/types";

// ─── Test Baseline ──────────────────────────────────────────────────────────

const mockBaseline: SatelliteComplianceStateInternal = {
  noradId: "LSO-FACILITY-001",
  satelliteName: "Andøya Spaceport",
  operatorId: "org-test",
  overallScore: 80,
  modules: {} as never,
  dataSources: {
    sentinel: { connected: false, lastPacket: null, packetsLast24h: 0 },
    verity: { attestations: 0, latestTrustLevel: null },
    assessment: { completedModules: 0, totalModules: 8, lastUpdated: null },
    celestrak: { lastTle: null, tleAge: null },
  },
  complianceHorizon: {
    daysUntilFirstBreach: 200,
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

describe("LSO Module Registry", () => {
  const lsoModules = MODULE_REGISTRY.LSO;

  it("has 8 modules", () => {
    expect(lsoModules).toHaveLength(8);
  });

  it("weights sum to 100", () => {
    const totalWeight = lsoModules.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("has no duplicate keys", () => {
    const keys = lsoModules.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("passes validation", () => {
    const result = validateRegistry("LSO");
    expect(result.valid).toBe(true);
  });

  it("has correct safety-critical modules", () => {
    const safetyCritical = getSafetyCriticalModules("LSO");
    expect(safetyCritical).toContain("site_authorization");
    expect(safetyCritical).toContain("range_safety_systems");
    expect(safetyCritical).toHaveLength(2);
  });

  it("returns weights as Record", () => {
    const weights = getModuleWeights("LSO");
    expect(weights.site_authorization).toBe(20);
    expect(weights.range_safety_systems).toBe(20);
    expect(weights.environmental_compliance).toBe(15);
    expect(weights.ground_infrastructure).toBe(12);
    expect(weights.cyber).toBe(10);
    expect(weights.insurance).toBe(8);
    expect(weights.emergency_response).toBe(8);
    expect(weights.documentation).toBe(7);
  });

  it("all modules have non-empty regulationRefs", () => {
    for (const mod of lsoModules) {
      expect(mod.regulationRefs.length).toBeGreaterThan(0);
    }
  });

  it("all modules have non-empty requiredDataSources", () => {
    for (const mod of lsoModules) {
      expect(mod.requiredDataSources.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe("LSO Deadlines", () => {
  it("has 15 deadlines", () => {
    expect(LSO_DEADLINES).toHaveLength(15);
  });

  it("has no duplicate keys", () => {
    const keys = LSO_DEADLINES.map((d) => d.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("all deadlines have required fields", () => {
    for (const deadline of LSO_DEADLINES) {
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
    for (const deadline of LSO_DEADLINES) {
      expect(validFrequencies).toContain(deadline.frequency);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("LSO Scenario Handlers", () => {
  it("runPadDamage major_destruction + all_pads is CRITICAL", () => {
    const result = runPadDamage(mockBaseline, {
      type: "LSO_PAD_DAMAGE",
      parameters: {
        severity: "major_destruction",
        padId: "all_pads",
        repairTimeDays: 365,
      },
    });
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.projectedHorizon).toBe(0);
  });

  it("runPadDamage minor_surface is LOW", () => {
    const result = runPadDamage(mockBaseline, {
      type: "LSO_PAD_DAMAGE",
      parameters: {
        severity: "minor_surface",
        padId: "pad_1",
        repairTimeDays: 14,
      },
    });
    expect(result.severityLevel).toBe("LOW");
  });

  it("runFtsSystemFailure is always CRITICAL", () => {
    const result = runFtsSystemFailure(mockBaseline, {
      type: "LSO_FTS_SYSTEM_FAILURE",
      parameters: { component: "command_transmitter" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.projectedHorizon).toBe(0);
    expect(result.affectedRegulations[0]!.statusAfter).toBe("NON_COMPLIANT");
  });

  it("runRangeRadarFailure total + no backup is CRITICAL", () => {
    const result = runRangeRadarFailure(mockBaseline, {
      type: "LSO_RANGE_RADAR_FAILURE",
      parameters: { failureType: "total_failure", redundancyAvailable: "no" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runRangeRadarFailure degraded is MEDIUM", () => {
    const result = runRangeRadarFailure(mockBaseline, {
      type: "LSO_RANGE_RADAR_FAILURE",
      parameters: {
        failureType: "degraded_accuracy",
        redundancyAvailable: "yes",
      },
    });
    expect(result.severityLevel).toBe("MEDIUM");
  });

  it("runWeatherStationOutage all systems is HIGH", () => {
    const result = runWeatherStationOutage(mockBaseline, {
      type: "LSO_WEATHER_STATION_OUTAGE",
      parameters: { systemsAffected: "all" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runNoiseComplianceViolation >15dB is CRITICAL", () => {
    const result = runNoiseComplianceViolation(mockBaseline, {
      type: "LSO_NOISE_COMPLIANCE_VIOLATION",
      parameters: { excessDb: 20 },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runNoiseComplianceViolation <5dB is MEDIUM", () => {
    const result = runNoiseComplianceViolation(mockBaseline, {
      type: "LSO_NOISE_COMPLIANCE_VIOLATION",
      parameters: { excessDb: 3 },
    });
    expect(result.severityLevel).toBe("MEDIUM");
  });

  it("runEmissionLimitBreach major is HIGH", () => {
    const result = runEmissionLimitBreach(mockBaseline, {
      type: "LSO_EMISSION_LIMIT_BREACH",
      parameters: { emissionType: "hcl", severity: "major" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runWildlifeImpactAssessment returns cost estimate", () => {
    const result = runWildlifeImpactAssessment(mockBaseline, {
      type: "LSO_WILDLIFE_IMPACT_ASSESSMENT",
      parameters: { species: "nesting_birds", assessmentTimeDays: 90 },
    });
    expect(result.costEstimate).toBeDefined();
    expect(result.costEstimate!.financialUsd).toBeGreaterThan(0);
    expect(result.severityLevel).toBe("MEDIUM");
  });

  it("runSiteLicenseConditionChange safety_zone_expansion is HIGH", () => {
    const result = runSiteLicenseConditionChange(mockBaseline, {
      type: "LSO_SITE_LICENSE_CONDITION_CHANGE",
      parameters: { conditionType: "safety_zone_expansion" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runAirspaceRestrictionChange returns valid structure", () => {
    const result = runAirspaceRestrictionChange(mockBaseline, {
      type: "LSO_AIRSPACE_RESTRICTION_CHANGE",
      parameters: { changeType: "restricted_zone_expansion" },
    });
    expect(result.severityLevel).toBe("HIGH");
    expect(result.recommendation).toBeTruthy();
  });

  it("runNotamConflict military_priority is HIGH", () => {
    const result = runNotamConflict(mockBaseline, {
      type: "LSO_NOTAM_CONFLICT",
      parameters: { conflictType: "military_priority" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("LSO Block Definitions", () => {
  const lsoBlocks = BLOCK_DEFINITIONS.filter((b) =>
    b.operatorTypes?.includes("LSO"),
  );

  it("has 10 LSO blocks", () => {
    expect(lsoBlocks).toHaveLength(10);
  });

  it("all blocks have valid parameter schemas", () => {
    for (const block of lsoBlocks) {
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
    const ids = lsoBlocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all blocks have valid categories", () => {
    const validCategories = [
      "site_infrastructure",
      "site_environmental",
      "site_regulatory",
    ];
    for (const block of lsoBlocks) {
      expect(validCategories).toContain(block.category);
    }
  });
});
