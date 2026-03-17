import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  prioritizeEvents,
  detectAnomaliesFromData,
} from "../../../src/lib/shield/fleet-intelligence.server";

describe("prioritizeEvents", () => {
  it("sorts EMERGENCY before HIGH", () => {
    const events = [
      {
        eventId: "e1",
        tier: "HIGH" as const,
        status: "ASSESSMENT_REQUIRED" as const,
        tca: new Date(Date.now() + 48 * 3600000),
        pc: 1e-4,
        conjunctionId: "c1",
        satelliteName: "SAT-1",
        decisionMadeAt: null,
      },
      {
        eventId: "e2",
        tier: "EMERGENCY" as const,
        status: "ASSESSMENT_REQUIRED" as const,
        tca: new Date(Date.now() + 48 * 3600000),
        pc: 1e-3,
        conjunctionId: "c2",
        satelliteName: "SAT-2",
        decisionMadeAt: null,
      },
    ];
    const result = prioritizeEvents(events);
    expect(result[0].eventId).toBe("e2");
    expect(result[0].priorityScore).toBeGreaterThan(result[1].priorityScore);
  });

  it("prioritizes closer TCA within same tier", () => {
    const events = [
      {
        eventId: "e1",
        tier: "HIGH" as const,
        status: "ASSESSMENT_REQUIRED" as const,
        tca: new Date(Date.now() + 5 * 24 * 3600000),
        pc: 1e-4,
        conjunctionId: "c1",
        satelliteName: "SAT-1",
        decisionMadeAt: null,
      },
      {
        eventId: "e2",
        tier: "HIGH" as const,
        status: "ASSESSMENT_REQUIRED" as const,
        tca: new Date(Date.now() + 12 * 3600000),
        pc: 1e-4,
        conjunctionId: "c2",
        satelliteName: "SAT-2",
        decisionMadeAt: null,
      },
    ];
    const result = prioritizeEvents(events);
    expect(result[0].eventId).toBe("e2"); // closer TCA = higher priority
  });

  it("boosts stale events awaiting decision", () => {
    const events = [
      {
        eventId: "e1",
        tier: "ELEVATED" as const,
        status: "ASSESSMENT_REQUIRED" as const,
        tca: new Date(Date.now() + 3 * 24 * 3600000),
        pc: 1e-5,
        conjunctionId: "c1",
        satelliteName: "SAT-1",
        decisionMadeAt: null,
        statusChangedAt: new Date(Date.now() - 25 * 3600000),
      },
      {
        eventId: "e2",
        tier: "ELEVATED" as const,
        status: "ASSESSMENT_REQUIRED" as const,
        tca: new Date(Date.now() + 3 * 24 * 3600000),
        pc: 1e-5,
        conjunctionId: "c2",
        satelliteName: "SAT-2",
        decisionMadeAt: null,
        statusChangedAt: new Date(Date.now() - 2 * 3600000),
      },
    ];
    const result = prioritizeEvents(events);
    expect(result[0].eventId).toBe("e1"); // stale > fresh
  });

  it("returns empty array for empty input", () => {
    expect(prioritizeEvents([])).toEqual([]);
  });
});

describe("detectAnomaliesFromData", () => {
  it("detects fleet anomaly when Z-score > 2", () => {
    const satelliteFreqs = [
      { noradId: "55001", name: "SAT-1", cdmsPerDay: 0.5 },
      { noradId: "55002", name: "SAT-2", cdmsPerDay: 0.6 },
      { noradId: "55003", name: "SAT-3", cdmsPerDay: 5.0 }, // anomaly
    ];
    const anomalies = detectAnomaliesFromData(satelliteFreqs);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].noradId).toBe("55003");
    expect(anomalies[0].type).toMatch(/anomaly/);
  });

  it("returns empty when all satellites have similar frequency", () => {
    const satelliteFreqs = [
      { noradId: "55001", name: "SAT-1", cdmsPerDay: 0.5 },
      { noradId: "55002", name: "SAT-2", cdmsPerDay: 0.6 },
      { noradId: "55003", name: "SAT-3", cdmsPerDay: 0.4 },
    ];
    const anomalies = detectAnomaliesFromData(satelliteFreqs);
    expect(anomalies.length).toBe(0);
  });

  it("handles single satellite (no fleet comparison)", () => {
    const satelliteFreqs = [
      { noradId: "55001", name: "SAT-1", cdmsPerDay: 5.0 },
    ];
    const anomalies = detectAnomaliesFromData(satelliteFreqs);
    expect(anomalies.length).toBe(0); // can't compute Z-score with 1 data point
  });
});
