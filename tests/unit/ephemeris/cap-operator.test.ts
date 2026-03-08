import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MODULE_REGISTRY,
  validateRegistry,
  getSafetyCriticalModules,
  getModuleWeights,
} from "@/lib/ephemeris/core/module-registry";
import { CAP_DEADLINES } from "@/data/cap-requirements";
import { BLOCK_DEFINITIONS } from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";
import {
  runCapServiceOutage,
  runCapCapacityDegradation,
  runCapSlaBreach,
  runCapGroundSegmentFailure,
  runCapBandwidthSaturation,
  runCapCustomerMigration,
  runCapNis2ClassificationChange,
  runCapDataSovereigntyChange,
} from "@/lib/ephemeris/simulation/handlers/cap";
import type { SatelliteComplianceStateInternal } from "@/lib/ephemeris/core/types";

// ─── Test Baseline ──────────────────────────────────────────────────────────

const mockBaseline: SatelliteComplianceStateInternal = {
  noradId: "CAP-SERVICE-001",
  satelliteName: "SES Astra 4A",
  operatorId: "org-test",
  overallScore: 82,
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

describe("CAP Module Registry", () => {
  const capModules = MODULE_REGISTRY.CAP;

  it("has 8 modules", () => {
    expect(capModules).toHaveLength(8);
  });

  it("weights sum to 100", () => {
    const totalWeight = capModules.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("has no duplicate keys", () => {
    const keys = capModules.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("passes validation", () => {
    const result = validateRegistry("CAP");
    expect(result.valid).toBe(true);
  });

  it("has correct safety-critical modules", () => {
    const safetyCritical = getSafetyCriticalModules("CAP");
    expect(safetyCritical).toContain("service_authorization");
    expect(safetyCritical).toContain("service_continuity");
    expect(safetyCritical).toHaveLength(2);
  });

  it("returns weights as Record", () => {
    const weights = getModuleWeights("CAP");
    expect(weights.service_authorization).toBe(20);
    expect(weights.service_continuity).toBe(18);
    expect(weights.capacity_management).toBe(15);
    expect(weights.cyber).toBe(12);
    expect(weights.sla_compliance).toBe(10);
    expect(weights.insurance).toBe(10);
    expect(weights.spectrum_coordination).toBe(8);
    expect(weights.documentation).toBe(7);
  });

  it("all modules have non-empty regulationRefs", () => {
    for (const mod of capModules) {
      expect(mod.regulationRefs.length).toBeGreaterThan(0);
    }
  });

  it("all modules have non-empty requiredDataSources", () => {
    for (const mod of capModules) {
      expect(mod.requiredDataSources.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAP Deadlines", () => {
  it("has 14 deadlines", () => {
    expect(CAP_DEADLINES).toHaveLength(14);
  });

  it("has no duplicate keys", () => {
    const keys = CAP_DEADLINES.map((d) => d.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("all deadlines have required fields", () => {
    for (const deadline of CAP_DEADLINES) {
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
    for (const deadline of CAP_DEADLINES) {
      expect(validFrequencies).toContain(deadline.frequency);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAP Scenario Handlers", () => {
  it("runCapServiceOutage total + extended is CRITICAL", () => {
    const result = runCapServiceOutage(mockBaseline, {
      type: "CAP_SERVICE_OUTAGE",
      parameters: { scope: "total", durationHours: 168 },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runCapServiceOutage partial is MEDIUM", () => {
    const result = runCapServiceOutage(mockBaseline, {
      type: "CAP_SERVICE_OUTAGE",
      parameters: { scope: "partial", durationHours: 12 },
    });
    expect(result.severityLevel).toBe("MEDIUM");
  });

  it("runCapCapacityDegradation >= 50% is HIGH", () => {
    const result = runCapCapacityDegradation(mockBaseline, {
      type: "CAP_CAPACITY_DEGRADATION",
      parameters: { degradationPct: 60 },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runCapSlaBreach major is HIGH", () => {
    const result = runCapSlaBreach(mockBaseline, {
      type: "CAP_SLA_BREACH",
      parameters: { severity: "major", customersAffected: 5 },
    });
    expect(result.severityLevel).toBe("HIGH");
    expect(result.costEstimate).toBeDefined();
    expect(result.costEstimate!.financialUsd).toBe(2_500_000);
  });

  it("runCapGroundSegmentFailure noc + no redundancy is CRITICAL", () => {
    const result = runCapGroundSegmentFailure(mockBaseline, {
      type: "CAP_GROUND_SEGMENT_FAILURE",
      parameters: { component: "noc", redundancy: "no" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runCapBandwidthSaturation >= 100% is HIGH", () => {
    const result = runCapBandwidthSaturation(mockBaseline, {
      type: "CAP_BANDWIDTH_SATURATION",
      parameters: { utilizationPct: 105 },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runCapCustomerMigration fleet_wide is HIGH", () => {
    const result = runCapCustomerMigration(mockBaseline, {
      type: "CAP_CUSTOMER_MIGRATION",
      parameters: { scale: "fleet_wide" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runCapNis2ClassificationChange essential is HIGH", () => {
    const result = runCapNis2ClassificationChange(mockBaseline, {
      type: "CAP_NIS2_CLASSIFICATION_CHANGE",
      parameters: { newClassification: "essential" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runCapDataSovereigntyChange multi_jurisdiction is HIGH", () => {
    const result = runCapDataSovereigntyChange(mockBaseline, {
      type: "CAP_DATA_SOVEREIGNTY_CHANGE",
      parameters: { scope: "multi_jurisdiction" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CAP Block Definitions", () => {
  const capBlocks = BLOCK_DEFINITIONS.filter((b) =>
    b.operatorTypes?.includes("CAP"),
  );

  it("has 8 CAP blocks", () => {
    expect(capBlocks).toHaveLength(8);
  });

  it("all blocks have valid parameter schemas", () => {
    for (const block of capBlocks) {
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
    const ids = capBlocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all blocks have valid categories", () => {
    const validCategories = [
      "capacity_management",
      "service_operations",
      "cap_regulatory",
    ];
    for (const block of capBlocks) {
      expect(validCategories).toContain(block.category);
    }
  });
});
