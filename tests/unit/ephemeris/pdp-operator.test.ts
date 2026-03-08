import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MODULE_REGISTRY,
  validateRegistry,
  getSafetyCriticalModules,
  getModuleWeights,
} from "@/lib/ephemeris/core/module-registry";
import { PDP_DEADLINES } from "@/data/pdp-requirements";
import { BLOCK_DEFINITIONS } from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";
import {
  runPdpDataBreach,
  runPdpGroundStationOutage,
  runPdpQualityDegradation,
  runPdpArchiveCorruption,
  runPdpDistributionViolation,
  runPdpNis2ClassificationChange,
  runPdpDataSovereigntyChange,
} from "@/lib/ephemeris/simulation/handlers/pdp";
import type { SatelliteComplianceStateInternal } from "@/lib/ephemeris/core/types";

// ─── Test Baseline ──────────────────────────────────────────────────────────

const mockBaseline: SatelliteComplianceStateInternal = {
  noradId: "PDP-SYSTEM-001",
  satelliteName: "Copernicus Ground Segment",
  operatorId: "org-test",
  overallScore: 78,
  modules: {} as never,
  dataSources: {
    sentinel: { connected: false, lastPacket: null, packetsLast24h: 0 },
    verity: { attestations: 0, latestTrustLevel: null },
    assessment: { completedModules: 0, totalModules: 8, lastUpdated: null },
    celestrak: { lastTle: null, tleAge: null },
  },
  complianceHorizon: {
    daysUntilFirstBreach: 190,
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

describe("PDP Module Registry", () => {
  const pdpModules = MODULE_REGISTRY.PDP;

  it("has 8 modules", () => {
    expect(pdpModules).toHaveLength(8);
  });

  it("weights sum to 100", () => {
    const totalWeight = pdpModules.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("has no duplicate keys", () => {
    const keys = pdpModules.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("passes validation", () => {
    const result = validateRegistry("PDP");
    expect(result.valid).toBe(true);
  });

  it("has correct safety-critical modules", () => {
    const safetyCritical = getSafetyCriticalModules("PDP");
    expect(safetyCritical).toContain("data_authorization");
    expect(safetyCritical).toContain("data_security");
    expect(safetyCritical).toHaveLength(2);
  });

  it("returns weights as Record", () => {
    const weights = getModuleWeights("PDP");
    expect(weights.data_authorization).toBe(20);
    expect(weights.data_security).toBe(18);
    expect(weights.data_quality).toBe(15);
    expect(weights.cyber).toBe(12);
    expect(weights.distribution_compliance).toBe(10);
    expect(weights.insurance).toBe(8);
    expect(weights.spectrum_rights).toBe(10);
    expect(weights.documentation).toBe(7);
  });

  it("all modules have non-empty regulationRefs", () => {
    for (const mod of pdpModules) {
      expect(mod.regulationRefs.length).toBeGreaterThan(0);
    }
  });

  it("all modules have non-empty requiredDataSources", () => {
    for (const mod of pdpModules) {
      expect(mod.requiredDataSources.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe("PDP Deadlines", () => {
  it("has 12 deadlines", () => {
    expect(PDP_DEADLINES).toHaveLength(12);
  });

  it("has no duplicate keys", () => {
    const keys = PDP_DEADLINES.map((d) => d.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("all deadlines have required fields", () => {
    for (const deadline of PDP_DEADLINES) {
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
    for (const deadline of PDP_DEADLINES) {
      expect(validFrequencies).toContain(deadline.frequency);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("PDP Scenario Handlers", () => {
  it("runPdpDataBreach major + restricted is CRITICAL", () => {
    const result = runPdpDataBreach(mockBaseline, {
      type: "PDP_DATA_BREACH",
      parameters: { dataType: "restricted", severity: "major" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.projectedHorizon).toBe(0);
  });

  it("runPdpDataBreach minor is MEDIUM", () => {
    const result = runPdpDataBreach(mockBaseline, {
      type: "PDP_DATA_BREACH",
      parameters: { dataType: "imagery", severity: "minor" },
    });
    expect(result.severityLevel).toBe("MEDIUM");
  });

  it("runPdpGroundStationOutage all is CRITICAL", () => {
    const result = runPdpGroundStationOutage(mockBaseline, {
      type: "PDP_GROUND_STATION_OUTAGE",
      parameters: { stationsAffected: "all" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runPdpQualityDegradation total_loss is HIGH", () => {
    const result = runPdpQualityDegradation(mockBaseline, {
      type: "PDP_QUALITY_DEGRADATION",
      parameters: { degradationType: "total_loss" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runPdpArchiveCorruption total is CRITICAL", () => {
    const result = runPdpArchiveCorruption(mockBaseline, {
      type: "PDP_ARCHIVE_CORRUPTION",
      parameters: { extent: "total" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.costEstimate).toBeDefined();
    expect(result.costEstimate!.financialUsd).toBe(5_000_000);
  });

  it("runPdpDistributionViolation export_control is CRITICAL", () => {
    const result = runPdpDistributionViolation(mockBaseline, {
      type: "PDP_DISTRIBUTION_VIOLATION",
      parameters: { violationType: "export_control" },
    });
    expect(result.severityLevel).toBe("CRITICAL");
  });

  it("runPdpNis2ClassificationChange essential is HIGH", () => {
    const result = runPdpNis2ClassificationChange(mockBaseline, {
      type: "PDP_NIS2_CLASSIFICATION_CHANGE",
      parameters: { newClassification: "essential" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });

  it("runPdpDataSovereigntyChange multi_jurisdiction is HIGH", () => {
    const result = runPdpDataSovereigntyChange(mockBaseline, {
      type: "PDP_DATA_SOVEREIGNTY_CHANGE",
      parameters: { scope: "multi_jurisdiction" },
    });
    expect(result.severityLevel).toBe("HIGH");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("PDP Block Definitions", () => {
  const pdpBlocks = BLOCK_DEFINITIONS.filter((b) =>
    b.operatorTypes?.includes("PDP"),
  );

  it("has 7 PDP blocks", () => {
    expect(pdpBlocks).toHaveLength(7);
  });

  it("all blocks have valid parameter schemas", () => {
    for (const block of pdpBlocks) {
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
    const ids = pdpBlocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all blocks have valid categories", () => {
    const validCategories = [
      "data_operations",
      "data_security_events",
      "pdp_regulatory",
    ];
    for (const block of pdpBlocks) {
      expect(validCategories).toContain(block.category);
    }
  });
});
