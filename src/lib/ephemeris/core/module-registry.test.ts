import { describe, it, expect, vi } from "vitest";
import {
  MODULE_REGISTRY,
  getModulesForType,
  getModuleWeights,
  getModuleConfig,
  getSafetyCriticalModules,
  validateRegistry,
} from "./module-registry";
import {
  spacecraftToEntity,
  getNoradId,
  getEntityDisplayId,
} from "./entity-adapter";
import type { OperatorEntityInput } from "./types";

// ─── Module Registry Tests ──────────────────────────────────────────────────

describe("Module Registry", () => {
  describe("SCO registry", () => {
    it("SCO weights sum to 105 (matching hardcoded MODULE_WEIGHTS)", () => {
      const modules = getModulesForType("SCO");
      const totalWeight = modules.reduce((sum, m) => sum + m.weight, 0);
      // Current hardcoded weights: 20+15+15+15+10+10+8+7+5 = 105
      expect(totalWeight).toBe(105);
    });

    it("SCO registry has no duplicate keys", () => {
      const modules = getModulesForType("SCO");
      const keys = modules.map((m) => m.key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it("SCO has exactly 9 modules", () => {
      const modules = getModulesForType("SCO");
      expect(modules.length).toBe(9);
    });

    it("SCO safety-critical modules are exactly fuel, orbital, subsystems, collision_avoidance", () => {
      const safetyCritical = getSafetyCriticalModules("SCO");
      expect(safetyCritical.sort()).toEqual(
        ["fuel", "orbital", "subsystems", "collision_avoidance"].sort(),
      );
    });

    it("getModuleWeights returns values matching hardcoded MODULE_WEIGHTS", () => {
      const weights = getModuleWeights("SCO");
      // These are the exact values from constants.ts MODULE_WEIGHTS
      expect(weights).toEqual({
        fuel: 20,
        orbital: 15,
        subsystems: 15,
        collision_avoidance: 15,
        cyber: 10,
        ground: 10,
        documentation: 8,
        insurance: 7,
        registration: 5,
      });
    });

    it("getModuleConfig returns weight and safetyGate matching constants.ts", () => {
      const config = getModuleConfig("SCO");
      expect(config.orbital).toEqual({ weight: 15, safetyGate: true });
      expect(config.fuel).toEqual({ weight: 20, safetyGate: true });
      expect(config.subsystems).toEqual({ weight: 15, safetyGate: true });
      expect(config.collision_avoidance).toEqual({
        weight: 15,
        safetyGate: true,
      });
      expect(config.cyber).toEqual({ weight: 10, safetyGate: false });
      expect(config.ground).toEqual({ weight: 10, safetyGate: false });
      expect(config.documentation).toEqual({ weight: 8, safetyGate: false });
      expect(config.insurance).toEqual({ weight: 7, safetyGate: false });
      expect(config.registration).toEqual({ weight: 5, safetyGate: false });
    });

    it("validateRegistry returns valid for SCO", () => {
      const result = validateRegistry("SCO");
      expect(result).toEqual({ valid: true });
    });
  });

  describe("LSO registry", () => {
    it("validateRegistry returns valid for LSO", () => {
      expect(validateRegistry("LSO")).toEqual({ valid: true });
    });

    it("validateRegistry returns valid for all operator types", () => {
      for (const type of ["LSO", "ISOS", "CAP", "PDP", "TCO"]) {
        expect(validateRegistry(type)).toEqual({ valid: true });
      }
    });

    it("getModulesForType returns 8 modules for LSO", () => {
      expect(getModulesForType("LSO")).toHaveLength(8);
    });

    it("getModulesForType returns empty array for unknown type", () => {
      expect(getModulesForType("UNKNOWN_TYPE")).toEqual([]);
    });

    it("getModuleWeights returns correct weights for LSO", () => {
      const weights = getModuleWeights("LSO");
      expect(weights).toEqual({
        site_authorization: 20,
        range_safety_systems: 20,
        environmental_compliance: 15,
        ground_infrastructure: 12,
        cyber: 10,
        insurance: 8,
        emergency_response: 8,
        documentation: 7,
      });
    });

    it("getSafetyCriticalModules returns correct modules for LSO", () => {
      expect(getSafetyCriticalModules("LSO").sort()).toEqual(
        ["site_authorization", "range_safety_systems"].sort(),
      );
    });
  });
});

// ─── Entity Adapter Tests ───────────────────────────────────────────────────

describe("Entity Adapter", () => {
  // Mock Spacecraft matching the Prisma model shape
  const mockSpacecraft = {
    id: "sc_123",
    organizationId: "org_456",
    name: "ISS",
    cosparId: "1998-067A",
    noradId: "25544",
    missionType: "space_station",
    launchDate: new Date("1998-11-20"),
    endOfLifeDate: null,
    orbitType: "LEO",
    altitudeKm: 408,
    inclinationDeg: 51.6,
    status: "OPERATIONAL" as const,
    description: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("spacecraftToEntity", () => {
    it("maps operatorType to SCO", () => {
      const entity = spacecraftToEntity(mockSpacecraft as never);
      expect(entity.operatorType).toBe("SCO");
    });

    it("maps basic fields correctly", () => {
      const entity = spacecraftToEntity(mockSpacecraft as never);
      expect(entity.id).toBe("sc_123");
      expect(entity.organizationId).toBe("org_456");
      expect(entity.name).toBe("ISS");
    });

    it("maps identifiers with noradId and cosparId", () => {
      const entity = spacecraftToEntity(mockSpacecraft as never);
      expect(entity.identifiers.type).toBe("SCO");
      expect(entity.identifiers.noradId).toBe("25544");
      expect(entity.identifiers.cosparId).toBe("1998-067A");
    });

    it("maps metadata with orbital params", () => {
      const entity = spacecraftToEntity(mockSpacecraft as never);
      expect(entity.metadata.type).toBe("SCO");
      expect(entity.metadata.altitudeKm).toBe(408);
      expect(entity.metadata.inclinationDeg).toBe(51.6);
      expect(entity.metadata.orbitType).toBe("LEO");
    });

    it("maps OPERATIONAL status to ACTIVE", () => {
      const entity = spacecraftToEntity(mockSpacecraft as never);
      expect(entity.status).toBe("ACTIVE");
    });

    it("maps LAUNCHED status to ACTIVE", () => {
      const sc = { ...mockSpacecraft, status: "LAUNCHED" as const };
      const entity = spacecraftToEntity(sc as never);
      expect(entity.status).toBe("ACTIVE");
    });

    it("maps PRE_LAUNCH status to PLANNED", () => {
      const sc = { ...mockSpacecraft, status: "PRE_LAUNCH" as const };
      const entity = spacecraftToEntity(sc as never);
      expect(entity.status).toBe("PLANNED");
    });

    it("maps DECOMMISSIONING status to DECOMMISSIONED", () => {
      const sc = { ...mockSpacecraft, status: "DECOMMISSIONING" as const };
      const entity = spacecraftToEntity(sc as never);
      expect(entity.status).toBe("DECOMMISSIONED");
    });

    it("maps DEORBITED status to DECOMMISSIONED", () => {
      const sc = { ...mockSpacecraft, status: "DEORBITED" as const };
      const entity = spacecraftToEntity(sc as never);
      expect(entity.status).toBe("DECOMMISSIONED");
    });

    it("handles null optional fields gracefully", () => {
      const sc = {
        ...mockSpacecraft,
        cosparId: null,
        noradId: null,
        altitudeKm: null,
        inclinationDeg: null,
        launchDate: null,
      };
      const entity = spacecraftToEntity(sc as never);
      expect(entity.identifiers.noradId).toBeUndefined();
      expect(entity.identifiers.cosparId).toBeUndefined();
      expect(entity.metadata.altitudeKm).toBeUndefined();
    });
  });

  describe("getNoradId", () => {
    it("returns noradId for SCO entities", () => {
      const entity: OperatorEntityInput = {
        id: "e1",
        organizationId: "org1",
        operatorType: "SCO",
        name: "Test",
        identifiers: { type: "SCO", noradId: "25544" },
        metadata: {},
        jurisdictions: [],
        status: "ACTIVE",
      };
      expect(getNoradId(entity)).toBe("25544");
    });

    it("returns undefined for non-SCO entities", () => {
      const entity: OperatorEntityInput = {
        id: "e1",
        organizationId: "org1",
        operatorType: "LO",
        name: "Test Launch",
        identifiers: { type: "LO", vehicleId: "v123" },
        metadata: {},
        jurisdictions: [],
        status: "ACTIVE",
      };
      expect(getNoradId(entity)).toBeUndefined();
    });

    it("returns undefined for SCO entity without noradId", () => {
      const entity: OperatorEntityInput = {
        id: "e1",
        organizationId: "org1",
        operatorType: "SCO",
        name: "Test",
        identifiers: { type: "SCO" },
        metadata: {},
        jurisdictions: [],
        status: "ACTIVE",
      };
      expect(getNoradId(entity)).toBeUndefined();
    });
  });

  describe("getEntityDisplayId", () => {
    it("returns noradId for SCO", () => {
      const entity: OperatorEntityInput = {
        id: "e1",
        organizationId: "org1",
        operatorType: "SCO",
        name: "Test",
        identifiers: { type: "SCO", noradId: "25544" },
        metadata: {},
        jurisdictions: [],
        status: "ACTIVE",
      };
      expect(getEntityDisplayId(entity)).toBe("25544");
    });

    it("falls back to id when type-specific identifier missing", () => {
      const entity: OperatorEntityInput = {
        id: "e1",
        organizationId: "org1",
        operatorType: "SCO",
        name: "Test",
        identifiers: { type: "SCO" },
        metadata: {},
        jurisdictions: [],
        status: "ACTIVE",
      };
      expect(getEntityDisplayId(entity)).toBe("e1");
    });

    it("returns vehicleId for LO", () => {
      const entity: OperatorEntityInput = {
        id: "e1",
        organizationId: "org1",
        operatorType: "LO",
        name: "Test",
        identifiers: { type: "LO", vehicleId: "v123" },
        metadata: {},
        jurisdictions: [],
        status: "ACTIVE",
      };
      expect(getEntityDisplayId(entity)).toBe("v123");
    });

    it("returns facilityId for LSO", () => {
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
      expect(getEntityDisplayId(entity)).toBe("f123");
    });
  });
});

// ─── calculateEntityComplianceState Tests ───────────────────────────────────

// These tests mock the server-only module to avoid import errors
vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));
vi.mock("../data/sentinel-adapter", () => ({
  getSentinelTimeSeries: vi
    .fn()
    .mockResolvedValue({ dataPoint: "test", points: [] }),
  getSentinelStatus: vi.fn().mockResolvedValue({
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
  getAssessmentData: vi.fn().mockResolvedValue({
    debris: null,
    cyber: null,
    insurance: null,
    environmental: null,
    nis2: null,
  }),
  getAssessmentStatus: vi.fn().mockResolvedValue({
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
  predictSubsystemHealth: vi.fn().mockReturnValue({
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

describe("calculateEntityComplianceState", () => {
  // Dynamic import to ensure mocks are applied
  it("delegates to calculateSatelliteComplianceState for SCO type", async () => {
    const { calculateEntityComplianceState } =
      await import("./satellite-compliance-state");

    const entity: OperatorEntityInput = {
      id: "e1",
      organizationId: "org1",
      operatorType: "SCO",
      name: "ISS",
      identifiers: { type: "SCO", noradId: "25544" },
      metadata: { type: "SCO", launchDate: "1998-11-20" },
      jurisdictions: [],
      status: "ACTIVE",
    };

    const mockPrisma = {
      satelliteAlert: null,
    } as never;

    const result = await calculateEntityComplianceState(entity, mockPrisma);
    expect(result).toBeDefined();
    expect(result.noradId).toBe("25544");
    expect(result.satelliteName).toBe("ISS");
    expect(result.operatorId).toBe("org1");
  });

  it("delegates to calculateLaunchComplianceState for LO type", async () => {
    const { calculateEntityComplianceState } =
      await import("./satellite-compliance-state");

    const entity: OperatorEntityInput = {
      id: "e1",
      organizationId: "org1",
      operatorType: "LO",
      name: "Test Launch",
      identifiers: { type: "LO", vehicleId: "v123" },
      metadata: {},
      jurisdictions: [],
      status: "ACTIVE",
    };

    const mockPrisma = {
      satelliteAlert: null,
    } as never;

    const result = await calculateEntityComplianceState(entity, mockPrisma);
    expect(result).toBeDefined();
    expect(result.noradId).toBe("v123");
    expect(result.satelliteName).toBe("Test Launch");
    expect(result.operatorId).toBe("org1");
  });

  it("throws for SCO entity missing noradId", async () => {
    const { calculateEntityComplianceState } =
      await import("./satellite-compliance-state");

    const entity: OperatorEntityInput = {
      id: "e1",
      organizationId: "org1",
      operatorType: "SCO",
      name: "Test",
      identifiers: { type: "SCO" },
      metadata: {},
      jurisdictions: [],
      status: "ACTIVE",
    };

    await expect(
      calculateEntityComplianceState(entity, {} as never),
    ).rejects.toThrow("SCO entity missing noradId");
  });
});
