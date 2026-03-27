import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  clampScore,
  calculateFavorabilityScore,
  mapScoreToLetterGrade,
  ASSESSMENT_MIN_DURATION_MS,
  EngineDataError,
  getOrgMemberUserIds,
} from "./shared.server";

describe("clampScore", () => {
  it("clamps values below 0 to 0", () => {
    expect(clampScore(-10)).toBe(0);
  });
  it("clamps values above 100 to 100", () => {
    expect(clampScore(150)).toBe(100);
  });
  it("passes through values in range", () => {
    expect(clampScore(50)).toBe(50);
  });
  it("handles exact boundaries", () => {
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });
  it("supports custom min/max", () => {
    expect(clampScore(5, 10, 90)).toBe(10);
    expect(clampScore(95, 10, 90)).toBe(90);
  });
});

describe("calculateFavorabilityScore", () => {
  it("returns 20 for jurisdictions with no space law", () => {
    const result = calculateFavorabilityScore({
      legislationStatus: "none",
      processingWeeks: { min: 0, max: 0 },
      hasGovernmentIndemnification: false,
      liabilityRegime: "unlimited",
      regulatoryMaturityYear: 2025,
      countryCode: "XX",
      hasNationalRegistry: false,
    });
    expect(result.score).toBe(20);
  });
  it("gives maximum score for ideal jurisdiction", () => {
    const result = calculateFavorabilityScore({
      legislationStatus: "enacted",
      processingWeeks: { min: 4, max: 8 },
      hasGovernmentIndemnification: true,
      liabilityRegime: "capped",
      regulatoryMaturityYear: 2008,
      countryCode: "FR",
      hasNationalRegistry: true,
    });
    expect(result.score).toBe(96);
    expect(result.factors).toContain("Fast licensing timeline");
    expect(result.factors).toContain("Government indemnification available");
  });
  it("clamps score to 0-100", () => {
    const result = calculateFavorabilityScore({
      legislationStatus: "enacted",
      processingWeeks: { min: 2, max: 4 },
      hasGovernmentIndemnification: true,
      liabilityRegime: "capped",
      regulatoryMaturityYear: 2005,
      countryCode: "LU",
      hasNationalRegistry: true,
      specialProvisions: { spaceResources: true, smallEntity: true },
      activityType: "space_resources",
      entitySize: "small",
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe("mapScoreToLetterGrade", () => {
  it("maps 90+ to A", () => {
    expect(mapScoreToLetterGrade(95)).toBe("A");
  });
  it("maps 80-89 to B", () => {
    expect(mapScoreToLetterGrade(85)).toBe("B");
  });
  it("maps 60-79 to C", () => {
    expect(mapScoreToLetterGrade(70)).toBe("C");
  });
  it("maps 40-59 to D", () => {
    expect(mapScoreToLetterGrade(50)).toBe("D");
  });
  it("maps below 40 to F", () => {
    expect(mapScoreToLetterGrade(20)).toBe("F");
  });
  it("handles exact boundaries", () => {
    expect(mapScoreToLetterGrade(90)).toBe("A");
    expect(mapScoreToLetterGrade(89)).toBe("B");
    expect(mapScoreToLetterGrade(80)).toBe("B");
    expect(mapScoreToLetterGrade(79)).toBe("C");
  });
});

describe("ASSESSMENT_MIN_DURATION_MS", () => {
  it("is 3000", () => {
    expect(ASSESSMENT_MIN_DURATION_MS).toBe(3000);
  });
});

describe("EngineDataError", () => {
  it("is an instance of Error", () => {
    const err = new EngineDataError("test", { engine: "nis2", dataFile: "x" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("EngineDataError");
    expect(err.message).toBe("test");
    expect(err.context.engine).toBe("nis2");
  });

  it("stores cause when provided", () => {
    const cause = new Error("original");
    const err = new EngineDataError("wrapped", {
      engine: "nis2",
      dataFile: "x",
      cause,
    });
    expect(err.context.cause).toBe(cause);
  });

  it("cause is undefined when not provided", () => {
    const err = new EngineDataError("test", { engine: "nis2", dataFile: "x" });
    expect(err.context.cause).toBeUndefined();
  });
});

describe("getOrgMemberUserIds", () => {
  it("returns an array of user ID strings", async () => {
    const mockPrisma = {
      organizationMember: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ userId: "user-1" }, { userId: "user-2" }]),
      },
    };
    const result = await getOrgMemberUserIds(mockPrisma, "org-123");
    expect(result).toEqual(["user-1", "user-2"]);
    expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-123" },
      select: { userId: true },
    });
  });
});
