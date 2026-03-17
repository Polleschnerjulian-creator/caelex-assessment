import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mergeCDMs } from "../../../src/lib/shield/cdm-merger.server";
import type { ParsedCDM } from "../../../src/lib/shield/types";

function makeCDM(overrides: Partial<ParsedCDM> & { cdmId: string }): ParsedCDM {
  return {
    cdmId: overrides.cdmId,
    creationDate: overrides.creationDate || new Date("2026-03-17T10:00:00Z"),
    tca: overrides.tca || new Date("2026-03-20T14:00:00Z"),
    missDistanceMeters: overrides.missDistanceMeters ?? 500,
    collisionProbability: overrides.collisionProbability ?? 1e-5,
    probabilityMethod: overrides.probabilityMethod || "FOSTER",
    relativeSpeedMs: overrides.relativeSpeedMs ?? 7800,
    sat1NoradId: overrides.sat1NoradId || "55001",
    sat1Name: overrides.sat1Name || "SAT-1",
    sat1ObjectType: overrides.sat1ObjectType || "PAYLOAD",
    sat2NoradId: overrides.sat2NoradId || "99001",
    sat2Name: overrides.sat2Name || "DEBRIS-X",
    sat2ObjectType: overrides.sat2ObjectType || "DEBRIS",
    sat2Maneuverable: null,
    rawCdm: {} as any,
  };
}

describe("mergeCDMs", () => {
  it("returns all CDMs when no overlap", () => {
    const st = [makeCDM({ cdmId: "st-1", sat2NoradId: "99001" })];
    const ll = [makeCDM({ cdmId: "leolabs-1", sat2NoradId: "99002" })];
    const result = mergeCDMs(st, ll);
    expect(result.length).toBe(2);
  });

  it("prefers LeoLabs when same conjunction detected by both", () => {
    const st = [
      makeCDM({ cdmId: "st-1", tca: new Date("2026-03-20T14:00:00Z") }),
    ];
    const ll = [
      makeCDM({
        cdmId: "leolabs-1",
        tca: new Date("2026-03-20T14:30:00Z"),
        collisionProbability: 1.8e-5,
      }),
    ];
    const result = mergeCDMs(st, ll);
    expect(result.length).toBe(2);
    expect(result[0].cdmId).toBe("leolabs-1");
  });

  it("returns Space-Track only when LeoLabs is empty", () => {
    const result = mergeCDMs(
      [
        makeCDM({ cdmId: "st-1" }),
        makeCDM({ cdmId: "st-2", sat2NoradId: "99002" }),
      ],
      [],
    );
    expect(result.length).toBe(2);
  });

  it("returns LeoLabs only when Space-Track is empty", () => {
    const result = mergeCDMs([], [makeCDM({ cdmId: "leolabs-1" })]);
    expect(result.length).toBe(1);
  });

  it("matches conjunctions within 1 hour TCA window", () => {
    const st = [
      makeCDM({ cdmId: "st-1", tca: new Date("2026-03-20T14:00:00Z") }),
    ];
    const ll = [
      makeCDM({ cdmId: "leolabs-1", tca: new Date("2026-03-20T14:45:00Z") }),
    ];
    const result = mergeCDMs(st, ll);
    expect(result.length).toBe(2);
    expect(result[0].cdmId).toBe("leolabs-1");
  });

  it("does NOT match when TCA differs by more than 1 hour", () => {
    const st = [
      makeCDM({ cdmId: "st-1", tca: new Date("2026-03-20T14:00:00Z") }),
    ];
    const ll = [
      makeCDM({ cdmId: "leolabs-1", tca: new Date("2026-03-20T16:00:00Z") }),
    ];
    const result = mergeCDMs(st, ll);
    expect(result.length).toBe(2);
  });
});
