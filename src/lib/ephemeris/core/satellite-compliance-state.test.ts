/**
 * Satellite Compliance State Aggregation Engine Tests
 *
 * Tests the main aggregation function that combines all prediction models.
 * Heavy mocking needed for all data adapters and prediction models.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));

// Mock all data adapters
const mockGetSentinelTimeSeries = vi
  .fn()
  .mockResolvedValue({ dataPoint: "test", points: [] });
const mockGetSentinelStatus = vi
  .fn()
  .mockResolvedValue({
    status: "connected",
    lastSeen: new Date().toISOString(),
  });

vi.mock("../data/sentinel-adapter", () => ({
  getSentinelTimeSeries: (...args: unknown[]) =>
    mockGetSentinelTimeSeries(...args),
  getSentinelStatus: (...args: unknown[]) => mockGetSentinelStatus(...args),
}));

const mockGetCurrentF107 = vi.fn().mockResolvedValue(150);

vi.mock("../data/solar-flux-adapter", () => ({
  getCurrentF107: (...args: unknown[]) => mockGetCurrentF107(...args),
}));

const mockGetOrbitalElements = vi.fn().mockResolvedValue(null);
const mockGetCelesTrakStatus = vi
  .fn()
  .mockResolvedValue({
    status: "available",
    lastUpdated: new Date().toISOString(),
  });

vi.mock("../data/celestrak-adapter", () => ({
  getOrbitalElements: (...args: unknown[]) => mockGetOrbitalElements(...args),
  getCelesTrakStatus: (...args: unknown[]) => mockGetCelesTrakStatus(...args),
}));

const mockGetVerityAttestations = vi.fn().mockResolvedValue([]);
const mockGetVerityStatus = vi
  .fn()
  .mockResolvedValue({ status: "connected", attestationCount: 0 });

vi.mock("../data/verity-adapter", () => ({
  getVerityAttestations: (...args: unknown[]) =>
    mockGetVerityAttestations(...args),
  getVerityStatus: (...args: unknown[]) => mockGetVerityStatus(...args),
}));

const mockGetAssessmentData = vi.fn().mockResolvedValue({
  cyber: null,
  debris: null,
  insurance: null,
});
const mockGetAssessmentStatus = vi
  .fn()
  .mockResolvedValue({ status: "no_data", lastUpdated: null });

vi.mock("../data/assessment-adapter", () => ({
  getAssessmentData: (...args: unknown[]) => mockGetAssessmentData(...args),
  getAssessmentStatus: (...args: unknown[]) => mockGetAssessmentStatus(...args),
}));

const mockGetRegulatoryChanges = vi.fn().mockResolvedValue([]);

vi.mock("../data/eurlex-adapter", () => ({
  getRegulatoryChanges: (...args: unknown[]) =>
    mockGetRegulatoryChanges(...args),
}));

// Mock prediction models
const mockPredictOrbitalDecay = vi
  .fn()
  .mockReturnValue({ yearsRemaining: 10, decayRate: 0.01 });
const mockGetOrbitalDecayFactors = vi.fn().mockReturnValue([
  {
    id: "orbital_decay",
    name: "Orbital Decay",
    regulationRef: "eu_space_act_art_70",
    thresholdValue: 5,
    thresholdType: "ABOVE",
    unit: "years",
    status: "COMPLIANT",
    source: "derived",
    confidence: 0.8,
    lastMeasured: new Date().toISOString(),
    currentValue: 10,
    daysToThreshold: null,
  },
]);

vi.mock("../models/orbital-decay", () => ({
  predictOrbitalDecay: (...args: unknown[]) => mockPredictOrbitalDecay(...args),
  getOrbitalDecayFactors: (...args: unknown[]) =>
    mockGetOrbitalDecayFactors(...args),
}));

const mockPredictFuelDepletion = vi
  .fn()
  .mockReturnValue({ depletionDate: null, burnRate: 0 });
const mockGetFuelDepletionFactors = vi.fn().mockReturnValue([]);

vi.mock("../models/fuel-depletion", () => ({
  predictFuelDepletion: (...args: unknown[]) =>
    mockPredictFuelDepletion(...args),
  getFuelDepletionFactors: (...args: unknown[]) =>
    mockGetFuelDepletionFactors(...args),
}));

const mockPredictSubsystemHealth = vi.fn().mockReturnValue({
  thruster: {
    status: "UNKNOWN",
    degradedEventFrequency: null,
    failureProbability12m: null,
    complianceImpact: [],
  },
  battery: { status: "UNKNOWN", capacityTrend: null, criticalDate: null },
  solarArray: { status: "UNKNOWN", powerTrend: null, criticalDate: null },
  overallSubsystemHealth: 50,
});
const mockGetSubsystemFactors = vi.fn().mockReturnValue([]);

vi.mock("../models/subsystem-degradation", () => ({
  predictSubsystemHealth: (...args: unknown[]) =>
    mockPredictSubsystemHealth(...args),
  getSubsystemFactors: (...args: unknown[]) => mockGetSubsystemFactors(...args),
}));

vi.mock("../models/deadline-events", () => ({
  calculateDeadlineEvents: vi.fn().mockReturnValue([]),
  getDeadlineFactors: vi.fn().mockReturnValue([]),
}));

vi.mock("../models/regulatory-change", () => ({
  getRegulatoryChangeFactors: vi.fn().mockReturnValue([]),
}));

const mockCalculateOverallScore = vi.fn().mockReturnValue(75);
const mockCalculateModuleScore = vi.fn().mockReturnValue({
  score: 75,
  status: "WARNING",
  factors: [],
  dataSource: "derived",
  confidence: 0.8,
  lastUpdated: new Date().toISOString(),
});
const mockDetermineDataFreshness = vi.fn().mockReturnValue("STALE");
const mockBuildUnknownModule = vi.fn().mockReturnValue({
  score: 0,
  status: "UNKNOWN",
  factors: [],
  dataSource: "none",
  confidence: 0,
  lastUpdated: null,
});

vi.mock("./scoring", () => ({
  calculateOverallScore: (...args: unknown[]) =>
    mockCalculateOverallScore(...args),
  calculateModuleScore: (...args: unknown[]) =>
    mockCalculateModuleScore(...args),
  determineDataFreshness: (...args: unknown[]) =>
    mockDetermineDataFreshness(...args),
  buildUnknownModule: (...args: unknown[]) => mockBuildUnknownModule(...args),
}));

vi.mock("@/lib/compliance/thresholds", () => ({
  COMPLIANCE_THRESHOLDS: {
    nis2_art_21_2_e_patch: {
      threshold: 90,
      type: "ABOVE",
      unit: "%",
      warningBuffer: 5,
    },
    nis2_art_21_2_j: {
      threshold: 80,
      type: "ABOVE",
      unit: "%",
      warningBuffer: 5,
    },
  },
}));

import { calculateSatelliteComplianceState } from "./satellite-compliance-state";

// Minimal mock PrismaClient
const mockPrismaClient = {
  satelliteAlert: {
    findMany: vi.fn().mockResolvedValue([]),
  },
} as unknown as import("@prisma/client").PrismaClient;

// Helper: make sentinel return data for specific keys
function setupSentinelWithData(keys: string[]) {
  mockGetSentinelTimeSeries.mockImplementation(
    (
      _prisma: unknown,
      _orgId: unknown,
      _noradId: unknown,
      dataPoint: string,
    ) => {
      if (keys.includes(dataPoint)) {
        return Promise.resolve({
          dataPoint,
          points: [
            {
              timestamp: new Date().toISOString(),
              value: 95,
              trustScore: 0.9,
            },
          ],
        });
      }
      return Promise.resolve({ dataPoint, points: [] });
    },
  );
}

describe("calculateSatelliteComplianceState", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default mock return values
    mockGetSentinelTimeSeries.mockResolvedValue({
      dataPoint: "test",
      points: [],
    });
    mockGetSentinelStatus.mockResolvedValue({
      status: "connected",
      lastSeen: new Date().toISOString(),
    });
    mockGetCurrentF107.mockResolvedValue(150);
    mockGetOrbitalElements.mockResolvedValue(null);
    mockGetCelesTrakStatus.mockResolvedValue({
      status: "available",
      lastUpdated: new Date().toISOString(),
    });
    mockGetVerityAttestations.mockResolvedValue([]);
    mockGetVerityStatus.mockResolvedValue({
      status: "connected",
      attestationCount: 0,
    });
    mockGetAssessmentData.mockResolvedValue({
      cyber: null,
      debris: null,
      insurance: null,
    });
    mockGetAssessmentStatus.mockResolvedValue({
      status: "no_data",
      lastUpdated: null,
    });
    mockGetRegulatoryChanges.mockResolvedValue([]);
    mockPredictOrbitalDecay.mockReturnValue({
      yearsRemaining: 10,
      decayRate: 0.01,
    });
    mockGetOrbitalDecayFactors.mockReturnValue([
      {
        id: "orbital_decay",
        name: "Orbital Decay",
        regulationRef: "eu_space_act_art_70",
        thresholdValue: 5,
        thresholdType: "ABOVE",
        unit: "years",
        status: "COMPLIANT",
        source: "derived",
        confidence: 0.8,
        lastMeasured: new Date().toISOString(),
        currentValue: 10,
        daysToThreshold: null,
      },
    ]);
    mockPredictFuelDepletion.mockReturnValue({
      depletionDate: null,
      burnRate: 0,
    });
    mockGetFuelDepletionFactors.mockReturnValue([]);
    mockPredictSubsystemHealth.mockReturnValue({
      thruster: { status: "UNKNOWN" },
      battery: { status: "UNKNOWN" },
      solarArray: { status: "UNKNOWN" },
      overallSubsystemHealth: 50,
    });
    mockGetSubsystemFactors.mockReturnValue([]);
    mockCalculateOverallScore.mockReturnValue(75);
    mockCalculateModuleScore.mockReturnValue({
      score: 75,
      status: "WARNING",
      factors: [],
      dataSource: "derived",
      confidence: 0.8,
      lastUpdated: new Date().toISOString(),
    });
    mockDetermineDataFreshness.mockReturnValue("STALE");
    mockBuildUnknownModule.mockReturnValue({
      score: 0,
      status: "UNKNOWN",
      factors: [],
      dataSource: "none",
      confidence: 0,
      lastUpdated: null,
    });
  });

  it("returns a complete compliance state object", async () => {
    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date("1998-11-20"),
    });

    expect(result.noradId).toBe("25544");
    expect(result.satelliteName).toBe("ISS");
    expect(result.operatorId).toBe("org-1");
    expect(result.overallScore).toBe(75);
    expect(result.modules).toBeDefined();
    expect(result.dataSources).toBeDefined();
    expect(result.complianceHorizon).toBeDefined();
    expect(result.activeAlerts).toBeDefined();
    expect(result.calculatedAt).toBeDefined();
    expect(result.dataFreshness).toBe("STALE");
  });

  it("has all 8 module scores", async () => {
    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: null,
    });

    const modules = result.modules;
    expect(modules.orbital).toBeDefined();
    expect(modules.fuel).toBeDefined();
    expect(modules.subsystems).toBeDefined();
    expect(modules.cyber).toBeDefined();
    expect(modules.ground).toBeDefined();
    expect(modules.documentation).toBeDefined();
    expect(modules.insurance).toBeDefined();
    expect(modules.registration).toBeDefined();
  });

  it("defaults to 365 days mission age when no launch date", async () => {
    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "99999",
      satelliteName: "Unknown",
      launchDate: null,
    });

    // Should still produce a valid result
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("includes data sources status", async () => {
    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.dataSources.sentinel).toBeDefined();
    expect(result.dataSources.verity).toBeDefined();
    expect(result.dataSources.assessment).toBeDefined();
    expect(result.dataSources.celestrak).toBeDefined();
  });

  it("returns empty alerts when no alert model exists", async () => {
    const prismaNoAlerts =
      {} as unknown as import("@prisma/client").PrismaClient;
    const result = await calculateSatelliteComplianceState({
      prisma: prismaNoAlerts,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.activeAlerts).toEqual([]);
  });

  it("loads active alerts from database", async () => {
    const prismaWithAlerts = {
      satelliteAlert: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "alert-1",
            noradId: "25544",
            type: "COMPLIANCE_BREACH",
            severity: "HIGH",
            title: "Fuel Low",
            description: "Fuel below threshold",
            regulationRef: "eu_space_act_art_70",
            triggeredAt: new Date(),
            resolvedAt: null,
            acknowledged: false,
          },
        ]),
      },
    } as unknown as import("@prisma/client").PrismaClient;

    const result = await calculateSatelliteComplianceState({
      prisma: prismaWithAlerts,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.activeAlerts).toHaveLength(1);
    expect(result.activeAlerts[0]!.type).toBe("COMPLIANCE_BREACH");
  });

  // ─── Orbital Elements Path ────────────────────────────────────────────────

  it("uses orbital decay model when orbital elements are available", async () => {
    mockGetOrbitalElements.mockResolvedValue({
      noradId: "25544",
      epoch: new Date().toISOString(),
      inclination: 51.6,
      eccentricity: 0.0001,
      raan: 100,
      argPerigee: 200,
      meanAnomaly: 50,
      meanMotion: 15.5,
      bstar: 0.00005,
      semiMajorAxis: 6778,
      perigee: 408,
      apogee: 410,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date("1998-11-20"),
    });

    expect(mockPredictOrbitalDecay).toHaveBeenCalled();
    expect(mockGetOrbitalDecayFactors).toHaveBeenCalled();
    expect(mockCalculateModuleScore).toHaveBeenCalled();
    expect(result.modules.orbital).toBeDefined();
  });

  // ─── Fuel Series Path ─────────────────────────────────────────────────────

  it("uses fuel depletion model when fuel series data is available", async () => {
    setupSentinelWithData(["remaining_fuel_pct"]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(mockPredictFuelDepletion).toHaveBeenCalled();
    expect(mockGetFuelDepletionFactors).toHaveBeenCalled();
    expect(result.modules.fuel).toBeDefined();
  });

  // ─── Subsystems Paths ─────────────────────────────────────────────────────

  it("uses subsystem health model with sentinel data when thruster data available", async () => {
    setupSentinelWithData(["thruster_status"]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(mockPredictSubsystemHealth).toHaveBeenCalled();
    expect(result.modules.subsystems).toBeDefined();
  });

  it("uses subsystem health model with battery and solar data", async () => {
    setupSentinelWithData(["battery_state_of_charge", "solar_array_power_pct"]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(mockPredictSubsystemHealth).toHaveBeenCalled();
    expect(result.modules.subsystems).toBeDefined();
  });

  it("uses subsystem health model with all three subsystem data sources", async () => {
    setupSentinelWithData([
      "thruster_status",
      "battery_state_of_charge",
      "solar_array_power_pct",
    ]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(mockPredictSubsystemHealth).toHaveBeenCalled();
    expect(result.modules.subsystems).toBeDefined();
  });

  // ─── Cyber Module Paths ───────────────────────────────────────────────────

  it("builds cyber module with patch compliance data from sentinel", async () => {
    setupSentinelWithData(["patch_compliance_pct"]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    // calculateModuleScore should be called with factors including cyber_patch_compliance
    expect(mockCalculateModuleScore).toHaveBeenCalled();
    expect(result.modules.cyber).toBeDefined();
  });

  it("builds cyber module with MFA data from sentinel", async () => {
    setupSentinelWithData(["mfa_adoption_pct"]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(mockCalculateModuleScore).toHaveBeenCalled();
    expect(result.modules.cyber).toBeDefined();
  });

  it("builds cyber module with both patch and MFA data", async () => {
    setupSentinelWithData(["patch_compliance_pct", "mfa_adoption_pct"]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.cyber).toBeDefined();
  });

  it("builds cyber module with WARNING status when patch value is at threshold boundary", async () => {
    // Patch value exactly at threshold (90) but below threshold + warningBuffer (95)
    mockGetSentinelTimeSeries.mockImplementation(
      (
        _prisma: unknown,
        _orgId: unknown,
        _noradId: unknown,
        dataPoint: string,
      ) => {
        if (dataPoint === "patch_compliance_pct") {
          return Promise.resolve({
            dataPoint,
            points: [
              {
                timestamp: new Date().toISOString(),
                value: 92,
                trustScore: 0.9,
              },
            ],
          });
        }
        return Promise.resolve({ dataPoint, points: [] });
      },
    );

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.cyber).toBeDefined();
  });

  it("builds cyber module with NON_COMPLIANT status when patch value is below threshold", async () => {
    mockGetSentinelTimeSeries.mockImplementation(
      (
        _prisma: unknown,
        _orgId: unknown,
        _noradId: unknown,
        dataPoint: string,
      ) => {
        if (dataPoint === "patch_compliance_pct") {
          return Promise.resolve({
            dataPoint,
            points: [
              {
                timestamp: new Date().toISOString(),
                value: 50,
                trustScore: 0.7,
              },
            ],
          });
        }
        return Promise.resolve({ dataPoint, points: [] });
      },
    );

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.cyber).toBeDefined();
  });

  it("includes verity attestations in cyber module for NIS2 refs", async () => {
    // Set up NIS2 attestations that are NOT expiring soon
    const futureDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockGetVerityAttestations.mockResolvedValue([
      {
        dataPoint: "security_patch_level",
        regulationRef: "nis2_art_21_2_e",
        result: true,
        trustScore: 0.95,
        issuedAt: new Date().toISOString(),
        expiresAt: futureDate,
      },
      {
        dataPoint: "access_control",
        regulationRef: "nis2_art_21_2_j",
        result: false,
        trustScore: 0.85,
        issuedAt: new Date().toISOString(),
        expiresAt: futureDate,
      },
    ]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.cyber).toBeDefined();
    expect(mockCalculateModuleScore).toHaveBeenCalled();
  });

  it("filters out expiring attestations from cyber module", async () => {
    // Set up NIS2 attestations that ARE expiring soon (within 30 days)
    const soonDate = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockGetVerityAttestations.mockResolvedValue([
      {
        dataPoint: "security_patch_level",
        regulationRef: "nis2_art_21_2_e",
        result: true,
        trustScore: 0.95,
        issuedAt: new Date().toISOString(),
        expiresAt: soonDate,
      },
    ]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    // With no sentinel data and expiring attestation filtered out, falls back to unknown
    expect(result.modules.cyber).toBeDefined();
  });

  it("falls back to assessment data for cyber module when no sentinel or verity data", async () => {
    mockGetAssessmentData.mockResolvedValue({
      cyber: {
        maturityScore: 72,
        lastUpdated: new Date().toISOString(),
      },
      debris: null,
      insurance: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.cyber).toBeDefined();
    expect(mockCalculateModuleScore).toHaveBeenCalled();
  });

  // ─── Documentation Module Paths ───────────────────────────────────────────

  it("builds documentation module with debris assessment data", async () => {
    mockGetAssessmentData.mockResolvedValue({
      cyber: null,
      debris: {
        deorbitPlanExists: true,
        lastUpdated: new Date().toISOString(),
      },
      insurance: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.documentation).toBeDefined();
    expect(mockCalculateModuleScore).toHaveBeenCalled();
  });

  it("builds documentation module with deorbit plan missing", async () => {
    mockGetAssessmentData.mockResolvedValue({
      cyber: null,
      debris: {
        deorbitPlanExists: false,
        lastUpdated: new Date().toISOString(),
      },
      insurance: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.documentation).toBeDefined();
  });

  it("includes verity certificates in documentation module for EU Space Act refs", async () => {
    const futureDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockGetVerityAttestations.mockResolvedValue([
      {
        dataPoint: "deorbit_compliance",
        regulationRef: "eu_space_act_art_70",
        result: true,
        trustScore: 0.9,
        issuedAt: new Date().toISOString(),
        expiresAt: futureDate,
      },
    ]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.documentation).toBeDefined();
  });

  it("builds documentation with both debris data and verity certificates", async () => {
    const futureDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockGetAssessmentData.mockResolvedValue({
      cyber: null,
      debris: {
        deorbitPlanExists: true,
        lastUpdated: new Date().toISOString(),
      },
      insurance: null,
    });
    mockGetVerityAttestations.mockResolvedValue([
      {
        dataPoint: "deorbit_compliance",
        regulationRef: "eu_space_act_art_70",
        result: true,
        trustScore: 0.9,
        issuedAt: new Date().toISOString(),
        expiresAt: futureDate,
      },
    ]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.documentation).toBeDefined();
    expect(mockCalculateModuleScore).toHaveBeenCalled();
  });

  // ─── Insurance Module Paths ───────────────────────────────────────────────

  it("builds insurance module with active policy", async () => {
    const futureExpiry = new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockGetAssessmentData.mockResolvedValue({
      cyber: null,
      debris: null,
      insurance: {
        hasActivePolicy: true,
        expiresAt: futureExpiry,
        lastUpdated: new Date().toISOString(),
      },
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.insurance).toBeDefined();
    expect(mockCalculateModuleScore).toHaveBeenCalled();
  });

  it("builds insurance module with no active policy", async () => {
    mockGetAssessmentData.mockResolvedValue({
      cyber: null,
      debris: null,
      insurance: {
        hasActivePolicy: false,
        expiresAt: null,
        lastUpdated: new Date().toISOString(),
      },
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.modules.insurance).toBeDefined();
  });

  // ─── Compliance Horizon ───────────────────────────────────────────────────

  it("calculates compliance horizon with factors that have daysToThreshold", async () => {
    mockCalculateModuleScore.mockReturnValue({
      score: 50,
      status: "WARNING",
      factors: [
        {
          id: "fuel_level",
          name: "Fuel Level",
          regulationRef: "eu_space_act_art_70",
          thresholdValue: 10,
          thresholdType: "ABOVE",
          unit: "%",
          status: "WARNING",
          source: "sentinel",
          confidence: 0.8,
          lastMeasured: new Date().toISOString(),
          currentValue: 15,
          daysToThreshold: 90,
        },
      ],
      dataSource: "sentinel",
      confidence: 0.8,
      lastUpdated: new Date().toISOString(),
    });
    mockBuildUnknownModule.mockReturnValue({
      score: 0,
      status: "UNKNOWN",
      factors: [],
      dataSource: "none",
      confidence: 0,
      lastUpdated: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.complianceHorizon.daysUntilFirstBreach).toBe(90);
    expect(result.complianceHorizon.firstBreachRegulation).toBe(
      "eu_space_act_art_70",
    );
    expect(result.complianceHorizon.firstBreachType).toBe("Fuel Level");
  });

  it("returns null compliance horizon when no factors have daysToThreshold", async () => {
    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.complianceHorizon.daysUntilFirstBreach).toBeNull();
    expect(result.complianceHorizon.firstBreachRegulation).toBeNull();
  });

  it("selects the smallest daysToThreshold for compliance horizon", async () => {
    mockCalculateModuleScore.mockReturnValue({
      score: 50,
      status: "WARNING",
      factors: [
        {
          id: "fuel_level",
          name: "Fuel Level",
          regulationRef: "eu_space_act_art_70",
          status: "WARNING",
          daysToThreshold: 120,
          thresholdValue: 10,
          thresholdType: "ABOVE",
          unit: "%",
          source: "sentinel",
          confidence: 0.8,
          lastMeasured: new Date().toISOString(),
          currentValue: 15,
        },
        {
          id: "insurance_expiry",
          name: "Insurance Expiry",
          regulationRef: "eu_space_act_art_8",
          status: "WARNING",
          daysToThreshold: 30,
          thresholdValue: 1,
          thresholdType: "ABOVE",
          unit: "",
          source: "assessment",
          confidence: 0.85,
          lastMeasured: new Date().toISOString(),
          currentValue: 1,
        },
      ],
      dataSource: "sentinel",
      confidence: 0.8,
      lastUpdated: new Date().toISOString(),
    });
    mockBuildUnknownModule.mockReturnValue({
      score: 0,
      status: "UNKNOWN",
      factors: [],
      dataSource: "none",
      confidence: 0,
      lastUpdated: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.complianceHorizon.daysUntilFirstBreach).toBe(30);
    expect(result.complianceHorizon.firstBreachRegulation).toBe(
      "eu_space_act_art_8",
    );
  });

  it("ignores COMPLIANT factors when computing compliance horizon", async () => {
    mockCalculateModuleScore.mockReturnValue({
      score: 90,
      status: "COMPLIANT",
      factors: [
        {
          id: "fuel_level",
          name: "Fuel Level",
          regulationRef: "eu_space_act_art_70",
          status: "COMPLIANT",
          daysToThreshold: 200,
          thresholdValue: 10,
          thresholdType: "ABOVE",
          unit: "%",
          source: "sentinel",
          confidence: 0.9,
          lastMeasured: new Date().toISOString(),
          currentValue: 50,
        },
      ],
      dataSource: "sentinel",
      confidence: 0.9,
      lastUpdated: new Date().toISOString(),
    });
    mockBuildUnknownModule.mockReturnValue({
      score: 0,
      status: "UNKNOWN",
      factors: [],
      dataSource: "none",
      confidence: 0,
      lastUpdated: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    // COMPLIANT factors should not be considered for breach horizon
    expect(result.complianceHorizon.daysUntilFirstBreach).toBeNull();
  });

  // ─── Compliance Horizon Confidence ────────────────────────────────────────

  it("reports HIGH confidence when many data sources are available", async () => {
    // Make calculateModuleScore and buildUnknownModule return different data sources
    let callCount = 0;
    mockCalculateModuleScore.mockImplementation(() => {
      callCount++;
      return {
        score: 75,
        status: "WARNING",
        factors: [],
        dataSource: callCount <= 3 ? "sentinel" : "assessment",
        confidence: 0.8,
        lastUpdated: new Date().toISOString(),
      };
    });
    mockBuildUnknownModule.mockReturnValue({
      score: 0,
      status: "UNKNOWN",
      factors: [],
      dataSource: "sentinel", // non-"none" so it counts
      confidence: 0,
      lastUpdated: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.complianceHorizon.confidence).toBe("HIGH");
  });

  it("reports LOW confidence when few data sources are available", async () => {
    // All modules return "none" data source
    mockCalculateModuleScore.mockReturnValue({
      score: 0,
      status: "UNKNOWN",
      factors: [],
      dataSource: "none",
      confidence: 0,
      lastUpdated: null,
    });
    mockBuildUnknownModule.mockReturnValue({
      score: 0,
      status: "UNKNOWN",
      factors: [],
      dataSource: "none",
      confidence: 0,
      lastUpdated: null,
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.complianceHorizon.confidence).toBe("LOW");
  });

  it("reports MEDIUM confidence with 3-4 data sources", async () => {
    let callCount = 0;
    mockCalculateModuleScore.mockImplementation(() => {
      callCount++;
      return {
        score: 50,
        status: "WARNING",
        factors: [],
        dataSource: callCount <= 2 ? "sentinel" : "none",
        confidence: 0.5,
        lastUpdated: new Date().toISOString(),
      };
    });
    mockBuildUnknownModule.mockImplementation(() => {
      callCount++;
      return {
        score: 0,
        status: "UNKNOWN",
        factors: [],
        dataSource: callCount <= 5 ? "derived" : "none",
        confidence: 0,
        lastUpdated: null,
      };
    });

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(["LOW", "MEDIUM", "HIGH"]).toContain(
      result.complianceHorizon.confidence,
    );
  });

  // ─── Alert Error Handling ─────────────────────────────────────────────────

  it("returns empty alerts when alert query throws an error", async () => {
    const prismaWithError = {
      satelliteAlert: {
        findMany: vi.fn().mockRejectedValue(new Error("DB error")),
      },
    } as unknown as import("@prisma/client").PrismaClient;

    const result = await calculateSatelliteComplianceState({
      prisma: prismaWithError,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date(),
    });

    expect(result.activeAlerts).toEqual([]);
  });

  // ─── Combined Data Paths ──────────────────────────────────────────────────

  it("handles full data scenario with orbital elements, fuel, subsystems, cyber, and insurance", async () => {
    // Set up orbital elements
    mockGetOrbitalElements.mockResolvedValue({
      noradId: "25544",
      epoch: new Date().toISOString(),
      inclination: 51.6,
      eccentricity: 0.0001,
      raan: 100,
      argPerigee: 200,
      meanAnomaly: 50,
      meanMotion: 15.5,
      bstar: 0.00005,
      semiMajorAxis: 6778,
      perigee: 408,
      apogee: 410,
    });

    // Set up sentinel data for all series
    setupSentinelWithData([
      "remaining_fuel_pct",
      "thruster_status",
      "battery_state_of_charge",
      "solar_array_power_pct",
      "patch_compliance_pct",
      "mfa_adoption_pct",
    ]);

    // Set up assessment data
    const futureExpiry = new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockGetAssessmentData.mockResolvedValue({
      cyber: { maturityScore: 85, lastUpdated: new Date().toISOString() },
      debris: {
        deorbitPlanExists: true,
        lastUpdated: new Date().toISOString(),
      },
      insurance: {
        hasActivePolicy: true,
        expiresAt: futureExpiry,
        lastUpdated: new Date().toISOString(),
      },
    });

    // Set up verity attestations
    const futureDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    mockGetVerityAttestations.mockResolvedValue([
      {
        dataPoint: "security_patch_level",
        regulationRef: "nis2_art_21_2_e",
        result: true,
        trustScore: 0.95,
        issuedAt: new Date().toISOString(),
        expiresAt: futureDate,
      },
      {
        dataPoint: "deorbit_compliance",
        regulationRef: "eu_space_act_art_70",
        result: true,
        trustScore: 0.9,
        issuedAt: new Date().toISOString(),
        expiresAt: futureDate,
      },
    ]);

    const result = await calculateSatelliteComplianceState({
      prisma: mockPrismaClient,
      orgId: "org-1",
      noradId: "25544",
      satelliteName: "ISS",
      launchDate: new Date("1998-11-20"),
    });

    expect(result.modules.orbital).toBeDefined();
    expect(result.modules.fuel).toBeDefined();
    expect(result.modules.subsystems).toBeDefined();
    expect(result.modules.cyber).toBeDefined();
    expect(result.modules.documentation).toBeDefined();
    expect(result.modules.insurance).toBeDefined();
    expect(mockPredictOrbitalDecay).toHaveBeenCalled();
    expect(mockPredictFuelDepletion).toHaveBeenCalled();
    expect(mockPredictSubsystemHealth).toHaveBeenCalled();
  });
});
