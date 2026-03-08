import { describe, it, expect, vi } from "vitest";
import {
  getModulesForType,
  getModuleWeights,
  getModuleConfig,
  getSafetyCriticalModules,
  validateRegistry,
} from "./module-registry";
import type { OperatorEntityInput } from "./types";
import { LAUNCH_DEADLINES } from "@/data/launch-operator-requirements";
import {
  BLOCK_DEFINITIONS,
  BLOCK_CATEGORIES,
} from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";

// ─── Module Registry Tests ──────────────────────────────────────────────────

describe("LO Module Registry", () => {
  it("LO weights sum to 100", () => {
    const modules = getModulesForType("LO");
    const totalWeight = modules.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("LO registry has no duplicate keys", () => {
    const modules = getModulesForType("LO");
    const keys = modules.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it("LO has exactly 9 modules", () => {
    const modules = getModulesForType("LO");
    expect(modules.length).toBe(9);
  });

  it("LO safety-critical modules are exactly launch_authorization, range_safety, third_party_liability", () => {
    const safetyCritical = getSafetyCriticalModules("LO");
    expect(safetyCritical.sort()).toEqual(
      ["launch_authorization", "range_safety", "third_party_liability"].sort(),
    );
  });

  it("getModuleWeights returns correct values for LO", () => {
    const weights = getModuleWeights("LO");
    expect(weights).toEqual({
      launch_authorization: 20,
      range_safety: 15,
      third_party_liability: 15,
      environmental_impact: 12,
      payload_integration: 10,
      cyber: 10,
      documentation: 8,
      frequency_coordination: 5,
      export_control: 5,
    });
  });

  it("getModuleConfig returns weight and safetyGate for all LO modules", () => {
    const config = getModuleConfig("LO");
    expect(config.launch_authorization).toEqual({
      weight: 20,
      safetyGate: true,
    });
    expect(config.range_safety).toEqual({ weight: 15, safetyGate: true });
    expect(config.third_party_liability).toEqual({
      weight: 15,
      safetyGate: true,
    });
    expect(config.environmental_impact).toEqual({
      weight: 12,
      safetyGate: false,
    });
    expect(config.payload_integration).toEqual({
      weight: 10,
      safetyGate: false,
    });
    expect(config.cyber).toEqual({ weight: 10, safetyGate: false });
    expect(config.documentation).toEqual({ weight: 8, safetyGate: false });
    expect(config.frequency_coordination).toEqual({
      weight: 5,
      safetyGate: false,
    });
    expect(config.export_control).toEqual({ weight: 5, safetyGate: false });
  });

  it("validateRegistry returns valid for LO", () => {
    const result = validateRegistry("LO");
    expect(result).toEqual({ valid: true });
  });

  it("SCO registry is unchanged (regression guard)", () => {
    const weights = getModuleWeights("SCO");
    expect(weights).toEqual({
      fuel: 20,
      orbital: 15,
      subsystems: 15,
      cyber: 10,
      ground: 10,
      documentation: 8,
      insurance: 7,
      registration: 5,
    });
  });
});

// ─── Launch Deadlines Tests ─────────────────────────────────────────────────

describe("LAUNCH_DEADLINES", () => {
  it("all deadlines have required fields", () => {
    for (const d of LAUNCH_DEADLINES) {
      expect(d.key).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(d.regulationRef).toBeTruthy();
      expect(["once", "per_campaign", "annual", "biannual"]).toContain(
        d.frequency,
      );
      expect(d.leadTimeDays).toBeGreaterThan(0);
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(d.baseSeverity);
    }
  });

  it("has deadlines for each LO module area", () => {
    const regRefs = LAUNCH_DEADLINES.map((d) => d.regulationRef);
    // Authorization
    expect(regRefs).toContain("eu_space_act_art_5");
    // Range Safety
    expect(regRefs).toContain("eu_space_act_art_62");
    // Insurance
    expect(regRefs).toContain("eu_space_act_art_8");
    // Environmental
    expect(regRefs).toContain("eu_space_act_art_66");
    // Cyber
    expect(regRefs).toContain("nis2_art_21");
    // Frequency
    expect(regRefs).toContain("itu_radio_regulations");
  });

  it("has no duplicate keys", () => {
    const keys = LAUNCH_DEADLINES.map((d) => d.key);
    expect(keys.length).toBe(new Set(keys).size);
  });
});

// ─── Block Definitions Tests ────────────────────────────────────────────────

describe("LO Block Definitions", () => {
  const loBlocks = BLOCK_DEFINITIONS.filter((b) =>
    b.operatorTypes?.includes("LO"),
  );

  it("has at least 16 LO-specific blocks", () => {
    expect(loBlocks.length).toBeGreaterThanOrEqual(16);
  });

  it("LO blocks all have operatorTypes set to ['LO']", () => {
    for (const block of loBlocks) {
      expect(block.operatorTypes).toEqual(["LO"]);
    }
  });

  it("LO blocks have unique IDs", () => {
    const ids = loBlocks.map((b) => b.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("LO blocks have unique scenarioTypes", () => {
    const types = loBlocks.map((b) => b.scenarioType);
    expect(types.length).toBe(new Set(types).size);
  });

  it("all LO scenarioTypes start with LO_", () => {
    for (const block of loBlocks) {
      expect(block.scenarioType).toMatch(/^LO_/);
    }
  });

  it("LO block categories exist in BLOCK_CATEGORIES", () => {
    const categoryIds = new Set(BLOCK_CATEGORIES.map((c) => c.id));
    for (const block of loBlocks) {
      expect(categoryIds.has(block.category)).toBe(true);
    }
  });

  it("existing SCO blocks do not have operatorTypes set", () => {
    const scoBlocks = BLOCK_DEFINITIONS.filter((b) => !b.operatorTypes);
    expect(scoBlocks.length).toBeGreaterThan(0);
    // All original 55 blocks should remain
    expect(scoBlocks.length).toBe(55);
  });
});

// ─── calculateEntityComplianceState Dispatch Tests ──────────────────────────

// Mock server-only modules for test environment
vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));
vi.mock("../data/sentinel-adapter", () => ({
  getSentinelTimeSeries: vi
    .fn()
    .mockResolvedValue({ dataPoint: "test", points: [] }),
  getSentinelStatus: vi
    .fn()
    .mockResolvedValue({
      connected: false,
      lastPacket: null,
      packetsLast24h: 0,
    }),
}));
vi.mock("../data/solar-flux-adapter", () => ({
  getCurrentF107: vi.fn().mockResolvedValue(150),
}));
vi.mock("../data/celestrak-adapter", () => ({
  getOrbitalElements: vi.fn().mockResolvedValue(null),
  getCelesTrakStatus: vi
    .fn()
    .mockResolvedValue({ lastTle: null, tleAge: null }),
}));
vi.mock("../data/verity-adapter", () => ({
  getVerityAttestations: vi.fn().mockResolvedValue([]),
  getVerityStatus: vi
    .fn()
    .mockResolvedValue({ attestations: 0, latestTrustLevel: null }),
}));
vi.mock("../data/assessment-adapter", () => ({
  getAssessmentData: vi
    .fn()
    .mockResolvedValue({
      debris: null,
      cyber: null,
      insurance: null,
      environmental: null,
      nis2: null,
    }),
  getAssessmentStatus: vi
    .fn()
    .mockResolvedValue({
      completedModules: 0,
      totalModules: 5,
      lastUpdated: null,
    }),
}));
vi.mock("../data/eurlex-adapter", () => ({
  getRegulatoryChanges: vi.fn().mockResolvedValue([]),
}));
vi.mock("../models/orbital-decay", () => ({
  predictOrbitalDecay: vi.fn(),
  getOrbitalDecayFactors: vi.fn().mockReturnValue([]),
}));
vi.mock("../models/fuel-depletion", () => ({
  predictFuelDepletion: vi.fn(),
  getFuelDepletionFactors: vi.fn().mockReturnValue([]),
}));
vi.mock("../models/subsystem-degradation", () => ({
  predictSubsystemHealth: vi
    .fn()
    .mockReturnValue({
      thruster: { status: "UNKNOWN" },
      battery: { status: "UNKNOWN" },
      solarArray: { status: "UNKNOWN" },
      overallSubsystemHealth: 0,
    }),
  getSubsystemFactors: vi.fn().mockReturnValue([]),
}));
vi.mock("../models/deadline-events", () => ({
  calculateDeadlineEvents: vi.fn().mockReturnValue([]),
  getDeadlineFactors: vi.fn().mockReturnValue([]),
}));
vi.mock("../models/regulatory-change", () => ({
  getRegulatoryChangeFactors: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/compliance/thresholds", () => ({
  COMPLIANCE_THRESHOLDS: {},
}));

describe("calculateEntityComplianceState — LO dispatch", () => {
  it("delegates to calculateLaunchComplianceState for LO type", async () => {
    const { calculateEntityComplianceState } =
      await import("./satellite-compliance-state");

    const entity: OperatorEntityInput = {
      id: "e1",
      organizationId: "org1",
      operatorType: "LO",
      name: "Spectrum-1",
      identifiers: { type: "LO", vehicleId: "v123" },
      metadata: {},
      jurisdictions: ["NO"],
      status: "ACTIVE",
    };

    const mockPrisma = {
      satelliteAlert: null,
    } as never;

    const result = await calculateEntityComplianceState(entity, mockPrisma);
    expect(result).toBeDefined();
    expect(result.noradId).toBe("v123"); // vehicleId is mapped to noradId field
    expect(result.satelliteName).toBe("Spectrum-1");
    expect(result.operatorId).toBe("org1");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("still throws for unsupported types like LSO", async () => {
    const { calculateEntityComplianceState } =
      await import("./satellite-compliance-state");

    const entity: OperatorEntityInput = {
      id: "e1",
      organizationId: "org1",
      operatorType: "LSO",
      name: "Test",
      identifiers: { type: "LSO", facilityId: "f123" },
      metadata: {},
      jurisdictions: [],
      status: "ACTIVE",
    };

    await expect(
      calculateEntityComplianceState(entity, {} as never),
    ).rejects.toThrow("Operator type LSO not yet supported in Ephemeris");
  });
});

// ─── Jurisdiction Simulator Tests ───────────────────────────────────────────

describe("Launch Jurisdiction Simulator", () => {
  it("simulateLaunchJurisdictionChange returns sensible NO→FR comparison", async () => {
    const { simulateLaunchJurisdictionChange } =
      await import("../simulation/jurisdiction-simulator");

    const result = simulateLaunchJurisdictionChange(
      "NO",
      "FR",
      { vehicleId: "v1", name: "Spectrum-1" },
      70,
    );

    expect(result.fromJurisdiction).toBe("NO");
    expect(result.toJurisdiction).toBe("FR");
    expect(result.vehicle.name).toBe("Spectrum-1");

    // FR has higher insurance (60M vs 45M)
    expect(result.insuranceDelta.deltaEur).toBeGreaterThan(0);

    // FR has longer approval (18 vs 12 months)
    expect(result.approvalTimelineDelta.deltaMonths).toBeGreaterThan(0);

    // FR has excellent equatorial, poor polar (opposite of NO)
    expect(result.orbitAccessComparison.equatorial.new).toBe("excellent");
    expect(result.orbitAccessComparison.polar.new).toContain("limited");

    // Score should decrease (FR is more expensive/stricter)
    expect(result.complianceDelta.scoreDelta).toBeLessThan(0);

    expect(result.narrative).toBeTruthy();
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.challenges.length).toBeGreaterThan(0);
  });

  it("throws for unknown launch jurisdiction", async () => {
    const { simulateLaunchJurisdictionChange } =
      await import("../simulation/jurisdiction-simulator");

    expect(() =>
      simulateLaunchJurisdictionChange(
        "XX",
        "FR",
        { vehicleId: "v1", name: "Test" },
        70,
      ),
    ).toThrow("Unknown launch jurisdiction");
  });
});

// ─── Scenario Handler Tests ────────────────────────────────────────────────

describe("LO Scenario Handlers", () => {
  const mockBaseline = {
    noradId: "v123",
    satelliteName: "Spectrum-1",
    operatorId: "org1",
    overallScore: 75,
    modules: {} as never,
    dataSources: {} as never,
    complianceHorizon: {
      daysUntilFirstBreach: 365,
      firstBreachRegulation: null,
      firstBreachType: null,
      confidence: "MEDIUM" as const,
    },
    activeAlerts: [],
    calculatedAt: new Date().toISOString(),
    dataFreshness: "RECENT" as const,
  };

  it("LO_LAUNCH_DELAY returns valid result", async () => {
    const { SCENARIO_HANDLERS } = await import("../simulation/handlers/index");

    const handler = SCENARIO_HANDLERS.LO_LAUNCH_DELAY;
    expect(handler).toBeDefined();

    const result = handler!(mockBaseline, {
      type: "LO_LAUNCH_DELAY",
      parameters: { delayDays: 30, reason: "technical" },
    });

    expect(result.horizonDelta).toBe(-30);
    expect(result.projectedHorizon).toBe(335);
    expect(result.recommendation).toContain("30 days");
    expect(result.severityLevel).toBe("MEDIUM");
  });

  it("LO_FTS_ACTIVATION returns CRITICAL with horizon 0", async () => {
    const { SCENARIO_HANDLERS } = await import("../simulation/handlers/index");

    const handler = SCENARIO_HANDLERS.LO_FTS_ACTIVATION;
    expect(handler).toBeDefined();

    const result = handler!(mockBaseline, {
      type: "LO_FTS_ACTIVATION",
      parameters: { flightPhase: "first_stage_burn" },
    });

    expect(result.projectedHorizon).toBe(0);
    expect(result.severityLevel).toBe("CRITICAL");
    expect(result.affectedRegulations.length).toBeGreaterThan(0);
  });

  it("all 16 LO handlers are registered", async () => {
    const { SCENARIO_HANDLERS } = await import("../simulation/handlers/index");

    const loHandlerKeys = Object.keys(SCENARIO_HANDLERS).filter((k) =>
      k.startsWith("LO_"),
    );
    expect(loHandlerKeys.length).toBe(16);
  });

  it("each LO handler returns a valid WhatIfResult structure", async () => {
    const { SCENARIO_HANDLERS } = await import("../simulation/handlers/index");

    const loHandlers = Object.entries(SCENARIO_HANDLERS).filter(([k]) =>
      k.startsWith("LO_"),
    );

    for (const [key, handler] of loHandlers) {
      const result = handler(mockBaseline, {
        type: key as never,
        parameters: {},
      });

      expect(result.scenario).toBeDefined();
      expect(typeof result.baselineHorizon).toBe("number");
      expect(typeof result.projectedHorizon).toBe("number");
      expect(typeof result.horizonDelta).toBe("number");
      expect(Array.isArray(result.affectedRegulations)).toBe(true);
      expect(typeof result.recommendation).toBe("string");
    }
  });
});
