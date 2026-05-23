/**
 * Tests for comply-bridge-service.ts.
 *
 * Coverage:
 *   1. Pure helpers — parseFrequencyDetails (malformed, valid, multi-band)
 *   2. Pure helpers — deriveItuPhase (each phase transition)
 *   3. Pure helpers — deriveDebrisStatus / deriveAuthorizationStatus bands
 *   4. Pure helpers — adminCodeToName
 *   5. Service — getDebrisStatus returns null when no mission link
 *   6. Service — getDebrisStatus returns spacecraft + null fields when no assessment
 *   7. Service — getDebrisStatus computes GEO-graveyard exemption
 *   8. Service — getSpectrumStatus returns null when no mission link
 *   9. Service — getSpectrumStatus picks the org's most-recent assessment
 *  10. Service — getAuthorizationStatus combines workflow + NIS2
 *  11. Service — getAuthorizationStatus returns null when no mission link
 *  12. Service — org-scope enforced (cross-org operationId resolves to null)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOperationFindFirst,
  mockDebrisFindFirst,
  mockSpectrumFindFirst,
  mockAuthFindFirst,
  mockNis2FindFirst,
  mockOrgMemberFindMany,
} = vi.hoisted(() => ({
  mockOperationFindFirst: vi.fn(),
  mockDebrisFindFirst: vi.fn(),
  mockSpectrumFindFirst: vi.fn(),
  mockAuthFindFirst: vi.fn(),
  mockNis2FindFirst: vi.fn(),
  mockOrgMemberFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: { findFirst: mockOperationFindFirst },
    debrisAssessment: { findFirst: mockDebrisFindFirst },
    spectrumAssessment: { findFirst: mockSpectrumFindFirst },
    authorizationWorkflow: { findFirst: mockAuthFindFirst },
    nIS2Assessment: { findFirst: mockNis2FindFirst },
    organizationMember: { findMany: mockOrgMemberFindMany },
  },
}));

import {
  parseFrequencyDetails,
  deriveItuPhase,
  __test__,
  getDebrisStatus,
  getSpectrumStatus,
  getAuthorizationStatus,
} from "./comply-bridge-service";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Spacecraft resolution fixture ───────────────────────────────────

const resolvedSpacecraftFixture = {
  missionRefId: "mission_1",
  missionRef: {
    id: "mission_1",
    name: "ICEYE-FY26-OPS",
    spacecraft: [
      {
        role: "primary",
        startedAt: new Date("2026-01-01"),
        spacecraft: {
          id: "sc_1",
          name: "ICEYE-X42",
          cosparId: "2026-001A",
          noradId: "60001",
          orbitType: "LEO",
        },
      },
    ],
  },
};

// ─── Pure helpers ────────────────────────────────────────────────────

describe("parseFrequencyDetails", () => {
  it("returns [] for null / empty / malformed", () => {
    expect(parseFrequencyDetails(null)).toEqual([]);
    expect(parseFrequencyDetails("")).toEqual([]);
    expect(parseFrequencyDetails("not-json")).toEqual([]);
    expect(parseFrequencyDetails("123")).toEqual([]);
  });

  it("extracts uplink + downlink MHz from a Ku-band assessment", () => {
    const json = JSON.stringify({
      Ku: {
        uplinkMHz: [14000, 14500],
        downlinkMHz: [11700, 12200],
        bandwidthMHz: 500,
      },
    });
    const out = parseFrequencyDetails(json);
    expect(out).toEqual([11700, 12200, 14000, 14500]);
  });

  it("flattens multiple bands and deduplicates", () => {
    const json = JSON.stringify({
      Ku: { uplinkMHz: [14000] },
      Ka: { uplinkMHz: [30000], downlinkMHz: [20000] },
      C: { centerMHz: 14000 }, // dupe of Ku uplink
    });
    expect(parseFrequencyDetails(json)).toEqual([14000, 20000, 30000]);
  });
});

describe("deriveItuPhase", () => {
  it("returns null when nothing has been filed", () => {
    expect(
      deriveItuPhase({
        apiStatus: "not_started",
        crCStatus: "not_started",
        notificationStatus: "not_started",
        recordingStatus: "not_started",
        biuAchieved: false,
      }),
    ).toBeNull();
  });

  it("returns OPERATIONAL when recorded + BIU achieved", () => {
    expect(
      deriveItuPhase({
        apiStatus: "published",
        crCStatus: "published",
        notificationStatus: "favorable",
        recordingStatus: "recorded",
        biuAchieved: true,
      }),
    ).toBe("OPERATIONAL");
  });

  it("returns DENIED on unfavorable examination", () => {
    expect(
      deriveItuPhase({
        apiStatus: "published",
        crCStatus: "published",
        notificationStatus: "unfavorable",
        recordingStatus: "not_started",
        biuAchieved: false,
      }),
    ).toBe("DENIED");
  });

  it("returns FILED for an API-only submission", () => {
    expect(
      deriveItuPhase({
        apiStatus: "submitted",
        crCStatus: "not_started",
        notificationStatus: "not_started",
        recordingStatus: "not_started",
        biuAchieved: false,
      }),
    ).toBe("FILED");
  });

  it("returns COORDINATED after Coordination Request published", () => {
    expect(
      deriveItuPhase({
        apiStatus: "published",
        crCStatus: "published",
        notificationStatus: "not_started",
        recordingStatus: "not_started",
        biuAchieved: false,
      }),
    ).toBe("COORDINATED");
  });

  it("returns NOTIFIED when notification submitted but not recorded", () => {
    expect(
      deriveItuPhase({
        apiStatus: "published",
        crCStatus: "published",
        notificationStatus: "submitted",
        recordingStatus: "not_started",
        biuAchieved: false,
      }),
    ).toBe("NOTIFIED");
  });
});

describe("derive*Status helpers", () => {
  it("debris: full green → compliant", () => {
    expect(__test__.deriveDebrisStatus(true, "yes", "yes", 85)).toBe(
      "compliant",
    );
  });

  it("debris: explicit no → non_compliant", () => {
    expect(__test__.deriveDebrisStatus(false, "no", "no", 30)).toBe(
      "non_compliant",
    );
  });

  it("debris: all-null → unknown", () => {
    expect(__test__.deriveDebrisStatus(null, null, null, null)).toBe("unknown");
  });

  it("authorization: approved → compliant", () => {
    expect(__test__.deriveAuthorizationStatus("approved")).toBe("compliant");
  });

  it("authorization: rejected → non_compliant", () => {
    expect(__test__.deriveAuthorizationStatus("rejected")).toBe(
      "non_compliant",
    );
  });

  it("authorization: in_progress → under_review", () => {
    expect(__test__.deriveAuthorizationStatus("in_progress")).toBe(
      "under_review",
    );
  });

  it("authorization: null → unknown", () => {
    expect(__test__.deriveAuthorizationStatus(null)).toBe("unknown");
  });
});

describe("adminCodeToName", () => {
  it("maps ITU admin codes to display names", () => {
    expect(__test__.adminCodeToName("D")).toBe("BNetzA (DE)");
    expect(__test__.adminCodeToName("USA")).toBe("FCC (US)");
    expect(__test__.adminCodeToName("G")).toBe("Ofcom (UK)");
  });

  it("passes through unmapped codes verbatim", () => {
    expect(__test__.adminCodeToName("ZZZ")).toBe("ZZZ");
  });

  it("returns null for null / undefined", () => {
    expect(__test__.adminCodeToName(null)).toBeNull();
    expect(__test__.adminCodeToName(undefined)).toBeNull();
  });
});

// ─── Service: getDebrisStatus ─────────────────────────────────────────

describe("getDebrisStatus", () => {
  it("returns null when the operation has no mission link", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      missionRefId: null,
      missionRef: null,
    });
    const result = await getDebrisStatus("op_1", "org_1");
    expect(result).toBeNull();
  });

  it("returns null when cross-org id is probed (org-scope enforced)", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(null);
    const result = await getDebrisStatus("op_1", "org_attacker");
    expect(result).toBeNull();
    expect(mockOperationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_attacker" }),
      }),
    );
  });

  it("returns spacecraft + unknown band when no DebrisAssessment exists", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(resolvedSpacecraftFixture);
    mockDebrisFindFirst.mockResolvedValueOnce(null);
    const result = await getDebrisStatus("op_1", "org_1");
    expect(result).toBeTruthy();
    expect(result!.status).toBe("unknown");
    expect(result!.spacecraft.spacecraftName).toBe("ICEYE-X42");
    expect(result!.iadcCompliant).toBeNull();
  });

  it("computes GEO-graveyard exemption + compliant status", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      ...resolvedSpacecraftFixture,
      missionRef: {
        ...resolvedSpacecraftFixture.missionRef,
        spacecraft: [
          {
            role: "primary",
            startedAt: new Date(),
            spacecraft: {
              id: "sc_geo",
              name: "GEOSAT-7",
              cosparId: null,
              noradId: null,
              orbitType: "GEO",
            },
          },
        ],
      },
    });
    mockDebrisFindFirst.mockResolvedValueOnce({
      complianceScore: 92,
      deorbitStrategy: "graveyard_orbit",
      deorbitTimelineYears: null,
      orbitType: "GEO",
      planGenerated: true,
      planGeneratedAt: new Date("2026-04-01"),
      updatedAt: new Date("2026-04-01"),
    });
    const result = await getDebrisStatus("op_1", "org_1");
    expect(result).toBeTruthy();
    expect(result!.deorbit25Year).toBe("exempt");
    expect(result!.iadcCompliant).toBe(true);
    expect(result!.fccOdmpStatus).toBe("yes");
    expect(result!.status).toBe("compliant");
  });

  it("flags LEO with passive_decay > 25y as non_compliant", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(resolvedSpacecraftFixture);
    mockDebrisFindFirst.mockResolvedValueOnce({
      complianceScore: 40,
      deorbitStrategy: "passive_decay",
      deorbitTimelineYears: 90,
      orbitType: "LEO",
      planGenerated: false,
      planGeneratedAt: null,
      updatedAt: new Date(),
    });
    const result = await getDebrisStatus("op_1", "org_1");
    expect(result!.deorbit25Year).toBe("no");
    expect(result!.status).toBe("non_compliant");
  });
});

// ─── Service: getSpectrumStatus ──────────────────────────────────────

describe("getSpectrumStatus", () => {
  it("returns null when the operation has no mission link", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      missionRefId: null,
      missionRef: null,
    });
    const result = await getSpectrumStatus("op_1", "org_1");
    expect(result).toBeNull();
  });

  it("returns the most-recent assessment for the org with derived ITU phase", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(resolvedSpacecraftFixture);
    mockOrgMemberFindMany.mockResolvedValueOnce([{ userId: "u_1" }]);
    // Name match returns nothing
    mockSpectrumFindFirst.mockResolvedValueOnce(null);
    // Fallback to most-recent org assessment
    mockSpectrumFindFirst.mockResolvedValueOnce({
      apiStatus: "published",
      crCStatus: "submitted",
      notificationStatus: "not_started",
      recordingStatus: "not_started",
      biuAchieved: false,
      frequencyDetails: JSON.stringify({
        Ku: { uplinkMHz: [14000], downlinkMHz: [11700] },
      }),
      administrationCode: "D",
      recordingReference: null,
      notificationReference: null,
      crCReference: "CRC-2026-001",
      apiReference: "API-2026-001",
    });
    const result = await getSpectrumStatus("op_1", "org_1");
    expect(result).toBeTruthy();
    expect(result!.ituStatus).toBe("COORDINATED");
    expect(result!.operatingFrequenciesMhz).toEqual([11700, 14000]);
    expect(result!.filingReference).toBe("CRC-2026-001");
    expect(result!.nationalAdministration).toBe("BNetzA (DE)");
    expect(result!.status).toBe("under_review");
  });

  it("returns unknown status when org has no assessment", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(resolvedSpacecraftFixture);
    mockOrgMemberFindMany.mockResolvedValueOnce([{ userId: "u_1" }]);
    mockSpectrumFindFirst.mockResolvedValueOnce(null);
    mockSpectrumFindFirst.mockResolvedValueOnce(null);
    const result = await getSpectrumStatus("op_1", "org_1");
    expect(result!.status).toBe("unknown");
    expect(result!.operatingFrequenciesMhz).toEqual([]);
  });
});

// ─── Service: getAuthorizationStatus ─────────────────────────────────

describe("getAuthorizationStatus", () => {
  it("returns null when the operation has no mission link", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      missionRefId: null,
      missionRef: null,
    });
    const result = await getAuthorizationStatus("op_1", "org_1");
    expect(result).toBeNull();
  });

  it("combines a mission-matched workflow + NIS2 classification", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(resolvedSpacecraftFixture);
    mockAuthFindFirst.mockResolvedValueOnce({
      status: "approved",
      primaryNCAName: "Bundesnetzagentur (DE)",
      pathway: "national_authorization",
    });
    mockNis2FindFirst.mockResolvedValueOnce({
      entityClassification: "essential",
    });
    const result = await getAuthorizationStatus("op_1", "org_1");
    expect(result).toBeTruthy();
    expect(result!.nationalAuthorizationStatus).toBe("approved");
    expect(result!.primaryNcaName).toBe("Bundesnetzagentur (DE)");
    expect(result!.euSpaceActPathway).toBe("national_authorization");
    expect(result!.nis2Classification).toBe("essential");
    expect(result!.status).toBe("compliant");
  });

  it("falls back to any org-member workflow when no mission-matched workflow exists", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(resolvedSpacecraftFixture);
    mockAuthFindFirst.mockResolvedValueOnce(null);
    mockOrgMemberFindMany.mockResolvedValueOnce([{ userId: "u_1" }]);
    mockAuthFindFirst.mockResolvedValueOnce({
      status: "submitted",
      primaryNCAName: "BAFA",
      pathway: "national_authorization",
    });
    mockNis2FindFirst.mockResolvedValueOnce(null);
    const result = await getAuthorizationStatus("op_1", "org_1");
    expect(result!.status).toBe("under_review");
    expect(result!.nis2Classification).toBeNull();
  });

  it("treats unknown NIS2 entityClassification value as null", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(resolvedSpacecraftFixture);
    mockAuthFindFirst.mockResolvedValueOnce(null);
    mockOrgMemberFindMany.mockResolvedValueOnce([]);
    mockNis2FindFirst.mockResolvedValueOnce({
      entityClassification: "junk_value",
    });
    const result = await getAuthorizationStatus("op_1", "org_1");
    expect(result!.nis2Classification).toBeNull();
    expect(result!.status).toBe("unknown");
  });
});
