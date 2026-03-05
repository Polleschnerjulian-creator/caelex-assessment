import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────
const mockGetSentinelTimeSeries = vi.hoisted(() => vi.fn());
const mockGetCurrentF107 = vi.hoisted(() => vi.fn());
const mockGetOrbitalElements = vi.hoisted(() => vi.fn());
const mockPredictOrbitalDecay = vi.hoisted(() => vi.fn());
const mockGetOrbitalDecayFactors = vi.hoisted(() => vi.fn());
const mockPredictFuelDepletion = vi.hoisted(() => vi.fn());
const mockGetFuelDepletionFactors = vi.hoisted(() => vi.fn());
const mockPredictSubsystemHealth = vi.hoisted(() => vi.fn());
const mockGetSubsystemFactors = vi.hoisted(() => vi.fn());
const mockCalculateComplianceHorizon = vi.hoisted(() => vi.fn());
const mockBuildForecastCurve = vi.hoisted(() => vi.fn());
const mockTimeSeriestoHistorical = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));
vi.mock("../data/sentinel-adapter", () => ({
  getSentinelTimeSeries: mockGetSentinelTimeSeries,
}));
vi.mock("../data/solar-flux-adapter", () => ({
  getCurrentF107: mockGetCurrentF107,
}));
vi.mock("../data/celestrak-adapter", () => ({
  getOrbitalElements: mockGetOrbitalElements,
}));
vi.mock("../models/orbital-decay", () => ({
  predictOrbitalDecay: mockPredictOrbitalDecay,
  getOrbitalDecayFactors: mockGetOrbitalDecayFactors,
}));
vi.mock("../models/fuel-depletion", () => ({
  predictFuelDepletion: mockPredictFuelDepletion,
  getFuelDepletionFactors: mockGetFuelDepletionFactors,
}));
vi.mock("../models/subsystem-degradation", () => ({
  predictSubsystemHealth: mockPredictSubsystemHealth,
  getSubsystemFactors: mockGetSubsystemFactors,
}));
vi.mock("./compliance-horizon", () => ({
  calculateComplianceHorizon: mockCalculateComplianceHorizon,
}));
vi.mock("./forecast-curve", () => ({
  buildForecastCurve: mockBuildForecastCurve,
  timeSeriestoHistorical: mockTimeSeriestoHistorical,
}));

import { generateForecast } from "./forecast-engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const emptySeries = { metric: "", noradId: "", points: [] as never[] };

function makeSubsystemForecast(
  overrides: {
    batteryCriticalDate?: string | null;
    solarCriticalDate?: string | null;
    batteryStatus?: string;
    solarStatus?: string;
  } = {},
) {
  return {
    thruster: {
      status: "NOMINAL",
      degradedEventFrequency: null,
      failureProbability12m: null,
      complianceImpact: [],
    },
    battery: {
      status: overrides.batteryStatus ?? "NOMINAL",
      capacityTrend: null,
      criticalDate: overrides.batteryCriticalDate ?? null,
    },
    solarArray: {
      status: overrides.solarStatus ?? "NOMINAL",
      powerTrend: null,
      criticalDate: overrides.solarCriticalDate ?? null,
    },
    overallSubsystemHealth: 90,
  };
}

const fakePrisma = {} as import("@prisma/client").PrismaClient;

function setupDefaults() {
  mockGetOrbitalElements.mockResolvedValue(null);
  mockGetCurrentF107.mockResolvedValue(150);
  mockGetSentinelTimeSeries.mockResolvedValue(emptySeries);
  mockPredictSubsystemHealth.mockReturnValue(makeSubsystemForecast());
  mockGetSubsystemFactors.mockReturnValue([]);
  mockBuildForecastCurve.mockReturnValue({
    regulationRef: "test",
    dataPoints: [],
  });
  mockTimeSeriestoHistorical.mockReturnValue([]);
}

describe("forecast-engine — generateForecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // No data scenario
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns empty curves and no events when no data available", async () => {
    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(result.forecastCurves).toHaveLength(0);
    expect(result.complianceEvents).toHaveLength(0);
    expect(result.horizonDays).toBeNull();
    expect(result.f107Used).toBe(150);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Orbital decay
  // ═══════════════════════════════════════════════════════════════════════════

  it("with orbital elements calls predictOrbitalDecay and builds altitude curve", async () => {
    const orbitalElements = {
      noradId: "12345",
      altitudeKm: 500,
      semiMajorAxisKm: 6871,
    };
    mockGetOrbitalElements.mockResolvedValue(orbitalElements);

    const decayForecast = {
      currentAltitudeKm: 500,
      estimatedLifetimeYears: 10,
      altitudeCurve: [{ date: "2025-01-01", nominal: 500 }],
      art68Status: "COMPLIANT",
      art68CrossingDate: null,
      reentryDate: null,
      confidence: "HIGH",
    };
    mockPredictOrbitalDecay.mockReturnValue(decayForecast);

    const altFactor = {
      id: "altitude",
      regulationRef: "test",
      thresholdType: "ABOVE",
    };
    mockGetOrbitalDecayFactors.mockReturnValue([null, altFactor]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(mockPredictOrbitalDecay).toHaveBeenCalledWith(orbitalElements, 150);
    expect(mockBuildForecastCurve).toHaveBeenCalledWith(
      altFactor,
      "orbital_decay",
      [],
      decayForecast.altitudeCurve,
      null,
    );
    expect(result.forecastCurves).toHaveLength(1);
    expect(result.complianceEvents).toHaveLength(0);
  });

  it("adds reentry event when reentryDate exists", async () => {
    const futureDate = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);
    const reentryDateStr = futureDate.toISOString();

    mockGetOrbitalElements.mockResolvedValue({ noradId: "12345" });
    mockPredictOrbitalDecay.mockReturnValue({
      altitudeCurve: [],
      reentryDate: reentryDateStr,
      confidence: "MEDIUM",
    });
    mockGetOrbitalDecayFactors.mockReturnValue([null, { id: "alt" }]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const reentryEvent = result.complianceEvents.find((e) =>
      e.id.includes("orbital_reentry"),
    );
    expect(reentryEvent).toBeDefined();
    expect(reentryEvent!.eventType).toBe("BREACH");
    expect(reentryEvent!.severity).toBe("CRITICAL");
    expect(reentryEvent!.model).toBe("orbital_decay");
    expect(reentryEvent!.regulationRef).toBe("eu_space_act_art_68");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Fuel depletion
  // ═══════════════════════════════════════════════════════════════════════════

  it("with >=2 fuel points calls predictFuelDepletion and builds fuel curve", async () => {
    const fuelSeries = {
      metric: "remaining_fuel_pct",
      noradId: "12345",
      points: [
        {
          timestamp: "2025-01-01",
          value: 80,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
        {
          timestamp: "2025-02-01",
          value: 75,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
      ],
    };
    // Return fuel series for the first call (remaining_fuel_pct), empty for rest
    mockGetSentinelTimeSeries
      .mockResolvedValueOnce(fuelSeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries);

    const fuelForecast = {
      currentFuelPct: 75,
      fuelCurve: [
        { date: "2025-02-01", nominal: 75, isHistorical: true },
        { date: "2025-06-01", nominal: 50, isHistorical: false },
      ],
      thresholdCrossings: [],
      confidence: "MEDIUM",
    };
    mockPredictFuelDepletion.mockReturnValue(fuelForecast);
    mockGetFuelDepletionFactors.mockReturnValue([
      { id: "art70_passivation", regulationRef: "eu_space_act_art_70" },
    ]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(mockPredictFuelDepletion).toHaveBeenCalledWith(fuelSeries);
    // fuel curve built (1 non-historical point in fuelCurve)
    expect(mockBuildForecastCurve).toHaveBeenCalled();
    expect(result.forecastCurves).toHaveLength(1);
  });

  it("fuel threshold crossing < 90 days is CRITICAL severity", async () => {
    const fuelSeries = {
      metric: "remaining_fuel_pct",
      noradId: "12345",
      points: [
        {
          timestamp: "2025-01-01",
          value: 80,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
        {
          timestamp: "2025-02-01",
          value: 75,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
      ],
    };
    mockGetSentinelTimeSeries
      .mockResolvedValueOnce(fuelSeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries);

    mockPredictFuelDepletion.mockReturnValue({
      fuelCurve: [],
      thresholdCrossings: [
        {
          regulationRef: "eu_space_act_art_72",
          thresholdPct: 25,
          crossingDate: { nominal: "2025-04-01" },
          daysFromNow: { nominal: 60 },
        },
      ],
      confidence: "MEDIUM",
    });
    mockGetFuelDepletionFactors.mockReturnValue([]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const fuelEvent = result.complianceEvents.find((e) =>
      e.id.includes("fuel_"),
    );
    expect(fuelEvent).toBeDefined();
    expect(fuelEvent!.severity).toBe("CRITICAL");
  });

  it("fuel threshold crossing < 365 days but >= 90 is HIGH severity", async () => {
    const fuelSeries = {
      metric: "remaining_fuel_pct",
      noradId: "12345",
      points: [
        {
          timestamp: "2025-01-01",
          value: 80,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
        {
          timestamp: "2025-02-01",
          value: 75,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
      ],
    };
    mockGetSentinelTimeSeries
      .mockResolvedValueOnce(fuelSeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries);

    mockPredictFuelDepletion.mockReturnValue({
      fuelCurve: [],
      thresholdCrossings: [
        {
          regulationRef: "eu_space_act_art_72",
          thresholdPct: 25,
          crossingDate: { nominal: "2025-10-01" },
          daysFromNow: { nominal: 200 },
        },
      ],
      confidence: "MEDIUM",
    });
    mockGetFuelDepletionFactors.mockReturnValue([]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const fuelEvent = result.complianceEvents.find((e) =>
      e.id.includes("fuel_"),
    );
    expect(fuelEvent!.severity).toBe("HIGH");
  });

  it("fuel threshold crossing >= 365 days is MEDIUM severity", async () => {
    const fuelSeries = {
      metric: "remaining_fuel_pct",
      noradId: "12345",
      points: [
        {
          timestamp: "2025-01-01",
          value: 80,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
        {
          timestamp: "2025-02-01",
          value: 75,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
      ],
    };
    mockGetSentinelTimeSeries
      .mockResolvedValueOnce(fuelSeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries);

    mockPredictFuelDepletion.mockReturnValue({
      fuelCurve: [],
      thresholdCrossings: [
        {
          regulationRef: "eu_space_act_art_72",
          thresholdPct: 25,
          crossingDate: { nominal: "2026-10-01" },
          daysFromNow: { nominal: 500 },
        },
      ],
      confidence: "MEDIUM",
    });
    mockGetFuelDepletionFactors.mockReturnValue([]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const fuelEvent = result.complianceEvents.find((e) =>
      e.id.includes("fuel_"),
    );
    expect(fuelEvent!.severity).toBe("MEDIUM");
  });

  it("fuel threshold >= 25% recommends disposal planning", async () => {
    const fuelSeries = {
      metric: "remaining_fuel_pct",
      noradId: "12345",
      points: [
        {
          timestamp: "2025-01-01",
          value: 80,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
        {
          timestamp: "2025-02-01",
          value: 75,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
      ],
    };
    mockGetSentinelTimeSeries
      .mockResolvedValueOnce(fuelSeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries);

    mockPredictFuelDepletion.mockReturnValue({
      fuelCurve: [],
      thresholdCrossings: [
        {
          regulationRef: "eu_space_act_art_72",
          thresholdPct: 25,
          crossingDate: { nominal: "2026-01-01" },
          daysFromNow: { nominal: 200 },
        },
      ],
      confidence: "MEDIUM",
    });
    mockGetFuelDepletionFactors.mockReturnValue([]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const fuelEvent = result.complianceEvents.find((e) =>
      e.id.includes("fuel_"),
    );
    expect(fuelEvent!.recommendedAction).toContain("disposal planning");
  });

  it("fuel threshold < 25% recommends passivation sequence", async () => {
    const fuelSeries = {
      metric: "remaining_fuel_pct",
      noradId: "12345",
      points: [
        {
          timestamp: "2025-01-01",
          value: 80,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
        {
          timestamp: "2025-02-01",
          value: 75,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
      ],
    };
    mockGetSentinelTimeSeries
      .mockResolvedValueOnce(fuelSeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries);

    mockPredictFuelDepletion.mockReturnValue({
      fuelCurve: [],
      thresholdCrossings: [
        {
          regulationRef: "eu_space_act_art_70",
          thresholdPct: 15,
          crossingDate: { nominal: "2026-01-01" },
          daysFromNow: { nominal: 200 },
        },
      ],
      confidence: "MEDIUM",
    });
    mockGetFuelDepletionFactors.mockReturnValue([]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const fuelEvent = result.complianceEvents.find((e) =>
      e.id.includes("fuel_"),
    );
    expect(fuelEvent!.recommendedAction).toContain("passivation sequence");
  });

  it("fuel threshold crossing with daysFromNow <= 0 is excluded", async () => {
    const fuelSeries = {
      metric: "remaining_fuel_pct",
      noradId: "12345",
      points: [
        {
          timestamp: "2025-01-01",
          value: 80,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
        {
          timestamp: "2025-02-01",
          value: 75,
          source: "orbit" as const,
          verified: true,
          trustScore: 1,
        },
      ],
    };
    mockGetSentinelTimeSeries
      .mockResolvedValueOnce(fuelSeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries)
      .mockResolvedValueOnce(emptySeries);

    mockPredictFuelDepletion.mockReturnValue({
      fuelCurve: [],
      thresholdCrossings: [
        {
          regulationRef: "eu_space_act_art_70",
          thresholdPct: 15,
          crossingDate: { nominal: "2024-01-01" },
          daysFromNow: { nominal: -100 },
        },
      ],
      confidence: "MEDIUM",
    });
    mockGetFuelDepletionFactors.mockReturnValue([]);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(
      result.complianceEvents.filter((e) => e.id.includes("fuel_")),
    ).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Subsystem degradation
  // ═══════════════════════════════════════════════════════════════════════════

  it("battery criticalDate adds compliance event", async () => {
    const futureDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: futureDate.toISOString(),
        batteryStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const batteryEvent = result.complianceEvents.find((e) =>
      e.id.includes("battery_critical"),
    );
    expect(batteryEvent).toBeDefined();
    expect(batteryEvent!.regulationRef).toBe("eu_space_act_art_64");
    expect(batteryEvent!.model).toBe("subsystem_degradation");
  });

  it("battery criticalDate < 180 days has HIGH severity", async () => {
    const futureDate = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: futureDate.toISOString(),
        batteryStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const batteryEvent = result.complianceEvents.find((e) =>
      e.id.includes("battery_critical"),
    );
    expect(batteryEvent!.severity).toBe("HIGH");
  });

  it("battery criticalDate >= 180 days has MEDIUM severity", async () => {
    const futureDate = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: futureDate.toISOString(),
        batteryStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const batteryEvent = result.complianceEvents.find((e) =>
      e.id.includes("battery_critical"),
    );
    expect(batteryEvent!.severity).toBe("MEDIUM");
  });

  it("battery status UNKNOWN gives LOW confidence", async () => {
    const futureDate = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: futureDate.toISOString(),
        batteryStatus: "UNKNOWN",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const batteryEvent = result.complianceEvents.find((e) =>
      e.id.includes("battery_critical"),
    );
    expect(batteryEvent!.confidence).toBe("LOW");
  });

  it("battery status not UNKNOWN gives MEDIUM confidence", async () => {
    const futureDate = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: futureDate.toISOString(),
        batteryStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const batteryEvent = result.complianceEvents.find((e) =>
      e.id.includes("battery_critical"),
    );
    expect(batteryEvent!.confidence).toBe("MEDIUM");
  });

  it("solar array criticalDate adds compliance event", async () => {
    const futureDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        solarCriticalDate: futureDate.toISOString(),
        solarStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const solarEvent = result.complianceEvents.find((e) =>
      e.id.includes("solar_critical"),
    );
    expect(solarEvent).toBeDefined();
    expect(solarEvent!.regulationRef).toBe("eu_space_act_art_64");
    expect(solarEvent!.model).toBe("subsystem_degradation");
  });

  it("solar array criticalDate < 180 days has HIGH severity", async () => {
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        solarCriticalDate: futureDate.toISOString(),
        solarStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    const solarEvent = result.complianceEvents.find((e) =>
      e.id.includes("solar_critical"),
    );
    expect(solarEvent!.severity).toBe("HIGH");
  });

  it("battery criticalDate in the past (daysToEvent <= 0) is excluded", async () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: pastDate.toISOString(),
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(
      result.complianceEvents.filter((e) => e.id.includes("battery_critical")),
    ).toHaveLength(0);
  });

  it("solar array criticalDate in the past is excluded", async () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        solarCriticalDate: pastDate.toISOString(),
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(
      result.complianceEvents.filter((e) => e.id.includes("solar_critical")),
    ).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sorting and horizon
  // ═══════════════════════════════════════════════════════════════════════════

  it("events are sorted by daysFromNow ascending", async () => {
    // Create battery and solar events at different times
    const solarDate = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
    const batteryDate = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);

    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: batteryDate.toISOString(),
        solarCriticalDate: solarDate.toISOString(),
        batteryStatus: "DEGRADING",
        solarStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(result.complianceEvents.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < result.complianceEvents.length; i++) {
      expect(result.complianceEvents[i]!.daysFromNow).toBeGreaterThanOrEqual(
        result.complianceEvents[i - 1]!.daysFromNow,
      );
    }
  });

  it("horizonDays comes from first event daysFromNow", async () => {
    const futureDate = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);
    mockPredictSubsystemHealth.mockReturnValue(
      makeSubsystemForecast({
        batteryCriticalDate: futureDate.toISOString(),
        batteryStatus: "DEGRADING",
      }),
    );

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(result.complianceEvents.length).toBeGreaterThanOrEqual(1);
    expect(result.horizonDays).toBe(result.complianceEvents[0]!.daysFromNow);
  });

  it("horizonDays is null when no events", async () => {
    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(result.horizonDays).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // launchDate null defaults missionAgeDays to 365
  // ═══════════════════════════════════════════════════════════════════════════

  it("launchDate null defaults missionAgeDays to 365", async () => {
    await generateForecast(fakePrisma, "org-1", "12345", null);

    // predictSubsystemHealth receives missionAgeDays as the 4th argument
    expect(mockPredictSubsystemHealth).toHaveBeenCalledWith(
      null, // no thruster series
      null, // no battery series
      null, // no solar series
      365,
    );
  });

  it("launchDate provided calculates correct missionAgeDays", async () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    await generateForecast(fakePrisma, "org-1", "12345", oneYearAgo);

    const call = mockPredictSubsystemHealth.mock.calls[0];
    // Should be approximately 365
    expect(call[3]).toBeGreaterThanOrEqual(364);
    expect(call[3]).toBeLessThanOrEqual(366);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // f107Used
  // ═══════════════════════════════════════════════════════════════════════════

  it("returns f107Used from getCurrentF107", async () => {
    mockGetCurrentF107.mockResolvedValue(200);

    const result = await generateForecast(
      fakePrisma,
      "org-1",
      "12345",
      new Date(),
    );

    expect(result.f107Used).toBe(200);
  });
});
