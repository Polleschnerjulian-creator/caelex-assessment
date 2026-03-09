import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  parseCDM,
  parseSpaceTrackResponse,
} from "@/lib/shield/space-track-client.server";
import type { SpaceTrackCDM } from "@/lib/shield/types";

const SAMPLE_CDM: SpaceTrackCDM = {
  CDM_ID: "cdm-2026-001",
  CREATION_DATE: "2026-03-09T10:30:00",
  TCA: "2026-03-12T14:22:33",
  MIN_RNG: "0.127",
  PC: "4.1e-4",
  PC_METHOD: "FOSTER-1992",
  SAT_1_ID: "25544",
  SAT_1_NAME: "ISS (ZARYA)",
  SAT1_OBJECT_TYPE: "PAYLOAD",
  SAT_1_RCS: "400.0",
  SAT_2_ID: "99999",
  SAT_2_NAME: "COSMOS-2251 DEB",
  SAT2_OBJECT_TYPE: "DEBRIS",
  SAT_2_RCS: "0.5",
  RELATIVE_SPEED: "14.2",
  SAT2_MANEUVERABLE: "NO",
};

describe("parseCDM", () => {
  it("parses a valid Space-Track CDM into canonical format", () => {
    const result = parseCDM(SAMPLE_CDM);
    expect(result.cdmId).toBe("cdm-2026-001");
    expect(result.collisionProbability).toBeCloseTo(4.1e-4);
    expect(result.missDistanceMeters).toBeCloseTo(127);
    expect(result.relativeSpeedMs).toBeCloseTo(14200);
    expect(result.sat1NoradId).toBe("25544");
    expect(result.sat1Name).toBe("ISS (ZARYA)");
    expect(result.sat2NoradId).toBe("99999");
    expect(result.sat2ObjectType).toBe("DEBRIS");
    expect(result.sat2Maneuverable).toBe("NO");
    expect(result.probabilityMethod).toBe("FOSTER-1992");
    expect(result.rawCdm).toEqual(SAMPLE_CDM);
  });

  it("converts MIN_RNG from km to meters", () => {
    const cdm = { ...SAMPLE_CDM, MIN_RNG: "1.5" };
    expect(parseCDM(cdm).missDistanceMeters).toBeCloseTo(1500);
  });

  it("converts RELATIVE_SPEED from km/s to m/s", () => {
    const cdm = { ...SAMPLE_CDM, RELATIVE_SPEED: "7.8" };
    expect(parseCDM(cdm).relativeSpeedMs).toBeCloseTo(7800);
  });

  it("handles null RELATIVE_SPEED", () => {
    const cdm = { ...SAMPLE_CDM, RELATIVE_SPEED: null };
    expect(parseCDM(cdm).relativeSpeedMs).toBeNull();
  });

  it("handles null PC_METHOD", () => {
    const cdm = { ...SAMPLE_CDM, PC_METHOD: null };
    expect(parseCDM(cdm).probabilityMethod).toBeNull();
  });

  it("parses scientific notation Pc strings", () => {
    expect(
      parseCDM({ ...SAMPLE_CDM, PC: "1.23e-7" }).collisionProbability,
    ).toBeCloseTo(1.23e-7);
    expect(
      parseCDM({ ...SAMPLE_CDM, PC: "0.001" }).collisionProbability,
    ).toBeCloseTo(0.001);
  });

  it("parses creation date and TCA as Date objects", () => {
    const result = parseCDM(SAMPLE_CDM);
    expect(result.creationDate).toBeInstanceOf(Date);
    expect(result.tca).toBeInstanceOf(Date);
    expect(result.creationDate.toISOString()).toContain("2026-03-09");
    expect(result.tca.toISOString()).toContain("2026-03-12");
  });
});

describe("parseSpaceTrackResponse", () => {
  it("parses an array of CDMs", () => {
    const response = [SAMPLE_CDM, { ...SAMPLE_CDM, CDM_ID: "cdm-002" }];
    const results = parseSpaceTrackResponse(response);
    expect(results).toHaveLength(2);
    expect(results[0]!.cdmId).toBe("cdm-2026-001");
    expect(results[1]!.cdmId).toBe("cdm-002");
  });

  it("returns empty array for empty response", () => {
    expect(parseSpaceTrackResponse([])).toEqual([]);
  });

  it("skips CDMs with invalid Pc (NaN)", () => {
    const bad = { ...SAMPLE_CDM, PC: "not-a-number" };
    const results = parseSpaceTrackResponse([SAMPLE_CDM, bad]);
    expect(results).toHaveLength(1);
  });
});
