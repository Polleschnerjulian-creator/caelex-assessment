import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { mapLeoLabsCDMToParsed } from "../../../src/lib/shield/leolabs-client.server";

const mockLeoLabsResponse = {
  conjunction_id: "conj-12345",
  probability_of_collision: 2.1e-5,
  miss_distance_km: 0.45,
  time_of_closest_approach: "2026-03-20T14:32:00Z",
  creation_date: "2026-03-17T10:00:00Z",
  primary: { norad_id: "55001", name: "SAT-1", object_type: "PAYLOAD" },
  secondary: { norad_id: "99001", name: "DEBRIS-X", object_type: "DEBRIS" },
  relative_speed_km_s: 7.8,
};

describe("mapLeoLabsCDMToParsed", () => {
  it("maps LeoLabs conjunction to ParsedCDM format", () => {
    const parsed = mapLeoLabsCDMToParsed(mockLeoLabsResponse);
    expect(parsed.cdmId).toBe("leolabs-conj-12345");
    expect(parsed.collisionProbability).toBe(2.1e-5);
    expect(parsed.missDistanceMeters).toBe(450);
    expect(parsed.sat1NoradId).toBe("55001");
    expect(parsed.sat2NoradId).toBe("99001");
    expect(parsed.relativeSpeedMs).toBe(7800);
    expect(parsed.tca).toBeInstanceOf(Date);
    expect(parsed.probabilityMethod).toBe("LEOLABS");
  });

  it("handles missing relative speed", () => {
    const minimal = { ...mockLeoLabsResponse, relative_speed_km_s: null };
    const parsed = mapLeoLabsCDMToParsed(minimal);
    expect(parsed.relativeSpeedMs).toBeNull();
  });

  it("prefixes CDM ID with leolabs-", () => {
    const parsed = mapLeoLabsCDMToParsed(mockLeoLabsResponse);
    expect(parsed.cdmId.startsWith("leolabs-")).toBe(true);
  });
});
