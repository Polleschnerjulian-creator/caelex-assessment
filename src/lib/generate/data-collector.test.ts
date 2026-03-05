import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockFindUniqueOrThrow = vi.fn();
const mockOrgFindUniqueOrThrow = vi.fn();
const mockDebrisFindFirst = vi.fn();
const mockCyberFindFirst = vi.fn();
const mockSpacecraftFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
    organization: {
      findUniqueOrThrow: (...args: unknown[]) =>
        mockOrgFindUniqueOrThrow(...args),
    },
    debrisAssessment: {
      findFirst: (...args: unknown[]) => mockDebrisFindFirst(...args),
    },
    cybersecurityAssessment: {
      findFirst: (...args: unknown[]) => mockCyberFindFirst(...args),
    },
    spacecraft: {
      findMany: (...args: unknown[]) => mockSpacecraftFindMany(...args),
    },
  },
}));

import { collectGenerate2Data } from "./data-collector";

describe("collectGenerate2Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFindUniqueOrThrow.mockResolvedValue({
      id: "user-123",
      operatorType: "SCO",
      establishmentCountry: "DE",
    });

    mockOrgFindUniqueOrThrow.mockResolvedValue({
      name: "Test Operator GmbH",
    });

    mockDebrisFindFirst.mockResolvedValue({
      id: "debris-1",
      missionName: "LEO-SAT-1",
      orbitType: "LEO",
      altitudeKm: 550,
      satelliteCount: 4,
      constellationTier: "small",
      hasManeuverability: "full",
      hasPropulsion: true,
      hasPassivationCap: true,
      plannedDurationYears: 5,
      deorbitStrategy: "controlled_reentry",
      deorbitTimelineYears: 2,
      caServiceProvider: "LeoLabs",
      complianceScore: 85,
      requirements: [
        {
          requirementId: "DM-001",
          status: "COMPLIANT",
          notes: "Met",
          responses: { q1: "yes" },
        },
      ],
    });

    mockCyberFindFirst.mockResolvedValue({
      id: "cyber-1",
      assessmentName: "Cyber Assessment",
      organizationSize: "MEDIUM",
      employeeCount: 50,
      spaceSegmentComplexity: "MEDIUM",
      satelliteCount: 4,
      dataSensitivityLevel: "CONFIDENTIAL",
      existingCertifications: "ISO 27001",
      hasSecurityTeam: true,
      securityTeamSize: 5,
      hasIncidentResponsePlan: true,
      hasBCP: true,
      criticalSupplierCount: 3,
      maturityScore: 70,
      isSimplifiedRegime: false,
      requirements: [
        {
          requirementId: "CS-001",
          status: "COMPLIANT",
          notes: null,
          responses: null,
        },
      ],
    });

    mockSpacecraftFindMany.mockResolvedValue([
      { name: "SAT-A", noradId: "55001", missionType: "EO" },
    ]);
  });

  it("returns a data bundle with operator information", async () => {
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.operator).toEqual({
      organizationName: "Test Operator GmbH",
      operatorType: "SCO",
      establishmentCountry: "DE",
      userId: "user-123",
    });
  });

  it("returns debris assessment data", async () => {
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.debris).not.toBeNull();
    expect(result.debris!.assessment.id).toBe("debris-1");
    expect(result.debris!.assessment.missionName).toBe("LEO-SAT-1");
    expect(result.debris!.assessment.orbitType).toBe("LEO");
    expect(result.debris!.assessment.altitudeKm).toBe(550);
  });

  it("returns debris requirements mapped correctly", async () => {
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.debris!.requirements).toHaveLength(1);
    expect(result.debris!.requirements[0]).toEqual({
      requirementId: "DM-001",
      status: "COMPLIANT",
      notes: "Met",
      responses: { q1: "yes" },
    });
  });

  it("returns cybersecurity assessment data", async () => {
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.cybersecurity).not.toBeNull();
    expect(result.cybersecurity!.assessment.id).toBe("cyber-1");
    expect(result.cybersecurity!.assessment.organizationSize).toBe("MEDIUM");
  });

  it("returns cybersecurity requirements mapped correctly", async () => {
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.cybersecurity!.requirements).toHaveLength(1);
    expect(result.cybersecurity!.requirements[0]).toEqual({
      requirementId: "CS-001",
      status: "COMPLIANT",
      notes: null,
      responses: null,
    });
  });

  it("returns spacecraft data", async () => {
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.spacecraft).toHaveLength(1);
    expect(result.spacecraft[0]).toEqual({
      name: "SAT-A",
      noradId: "55001",
      missionType: "EO",
    });
  });

  it("returns null debris when debrisAssessment findFirst fails", async () => {
    mockDebrisFindFirst.mockResolvedValue(null);
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.debris).toBeNull();
  });

  it("returns null cybersecurity when cybersecurityAssessment findFirst fails", async () => {
    mockCyberFindFirst.mockResolvedValue(null);
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.cybersecurity).toBeNull();
  });

  it("returns empty spacecraft array when none found", async () => {
    mockSpacecraftFindMany.mockResolvedValue([]);
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.spacecraft).toEqual([]);
  });

  it("calls prisma with correct userId and organizationId", async () => {
    await collectGenerate2Data("user-abc", "org-xyz");

    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-abc" },
      }),
    );

    expect(mockOrgFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-xyz" },
      }),
    );
  });

  it("returns null debris when debrisAssessment findFirst rejects (catch branch)", async () => {
    mockDebrisFindFirst.mockRejectedValue(new Error("DB timeout"));
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.debris).toBeNull();
  });

  it("returns null cybersecurity when cybersecurityAssessment findFirst rejects (catch branch)", async () => {
    mockCyberFindFirst.mockRejectedValue(new Error("DB timeout"));
    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.cybersecurity).toBeNull();
  });

  it("handles null responses in requirements", async () => {
    mockDebrisFindFirst.mockResolvedValue({
      id: "debris-2",
      missionName: null,
      orbitType: "GEO",
      altitudeKm: 35786,
      satelliteCount: 1,
      constellationTier: "none",
      hasManeuverability: "limited",
      hasPropulsion: true,
      hasPassivationCap: false,
      plannedDurationYears: 15,
      deorbitStrategy: "graveyard_orbit",
      deorbitTimelineYears: null,
      caServiceProvider: null,
      complianceScore: null,
      requirements: [
        {
          requirementId: "DM-002",
          status: "PARTIAL",
          notes: null,
          responses: null,
        },
      ],
    });

    const result = await collectGenerate2Data("user-123", "org-456");
    expect(result.debris!.requirements[0].responses).toBeNull();
  });
});
