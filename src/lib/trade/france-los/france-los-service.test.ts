/**
 * Tests for src/lib/trade/france-los/france-los-service.ts (Z34-FR, Tier 4).
 *
 * Coverage (20 cases):
 *   Casualty-risk calculator (LOS Art. R. 331-21 boundary tests):
 *     1.  exact 1 in 10⁴ (1e-4) → compliant (threshold is inclusive)
 *     2.  just below threshold (9.99e-5) → compliant
 *     3.  just above threshold (1.01e-4) → non-compliant
 *     4.  zero risk → compliant
 *     5.  negative figure → non-compliant + invalid-input rationale
 *     6.  NaN → non-compliant + missing-figure rationale
 *     7.  Infinity → non-compliant + missing-figure rationale
 *     8.  missing object → non-compliant + missing-assessment rationale
 *     9.  null casualtyRisk field → non-compliant
 *     10. very small risk (1e-10) → compliant
 *
 *   Service layer:
 *     11. listLosAuthorisations org-scopes the query
 *     12. listLosAuthorisations applies status filter
 *     13. getLosAuthorisation returns null for cross-org id (no leak)
 *     14. createLosAuthorisation refuses missing operatorName
 *     15. createLosAuthorisation refuses missing missionName
 *     16. createLosAuthorisation refuses launchVehicle from other org
 *     17. createLosAuthorisation happy path with DRAFT default
 *     18. submitToCnes refuses non-DRAFT rows
 *     19. submitToCnes happy path stamps submittedAt
 *     20. recordCnesDecision happy path stamps cnesReference + decisionAt
 *     21. recordCnesDecision refuses non-SUBMITTED/UNDER_REVIEW rows
 *     22. recordCnesDecision requires cnesReference
 *     23. markMissionCompleted refuses non-AUTHORISED rows
 *     24. markMissionCompleted happy path
 *     25. revokeAuthorisation refuses terminal states
 *     26. listExpiring filters AUTHORISED rows within window
 *     27. listExpiring returns [] for non-positive days
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockLosFindMany,
  mockLosFindFirst,
  mockLosCreate,
  mockLosUpdate,
  mockOpFindFirst,
} = vi.hoisted(() => ({
  mockLosFindMany: vi.fn(),
  mockLosFindFirst: vi.fn(),
  mockLosCreate: vi.fn(),
  mockLosUpdate: vi.fn(),
  mockOpFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeFranceLosAuthorisation: {
      findMany: mockLosFindMany,
      findFirst: mockLosFindFirst,
      create: mockLosCreate,
      update: mockLosUpdate,
    },
    tradeOperation: { findFirst: mockOpFindFirst },
  },
}));

import {
  calculateCasualtyRiskCompliance,
  CASUALTY_RISK_THRESHOLD_R331_21,
  listLosAuthorisations,
  getLosAuthorisation,
  createLosAuthorisation,
  submitToCnes,
  recordCnesDecision,
  markMissionCompleted,
  revokeAuthorisation,
  listExpiring,
} from "./france-los-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseLos = {
  id: "los_1",
  organizationId: "org_1",
  operatorName: "ArianeGroup SAS",
  operatorAddress: null,
  authorisationType: "LAUNCH" as const,
  cnesReference: null,
  missionName: "Ariane 6 VA-261",
  missionDescription: null,
  spacecraftClassification: "OPERATIONAL_COMMERCIAL" as const,
  launchVehicleId: null,
  apogeeKm: 600,
  perigeeKm: 595,
  inclinationDeg: 97.4,
  debrisMitigationPlanRef: "DMP-2026-01",
  reEntryRiskAssessment: null,
  validFrom: null,
  validUntil: null,
  status: "DRAFT" as const,
  lastActionById: "user_1",
  notes: null,
  submittedAt: null,
  reviewStartAt: null,
  decisionAt: null,
  completedAt: null,
  createdAt: new Date("2026-05-23"),
  updatedAt: new Date("2026-05-23"),
};

// ─── Casualty-risk calculator (LOS Art. R. 331-21) ───────────────────

describe("calculateCasualtyRiskCompliance — LOS Art. R. 331-21 boundary tests", () => {
  it("exposes the 1 in 10⁴ threshold constant", () => {
    expect(CASUALTY_RISK_THRESHOLD_R331_21).toBe(1e-4);
  });

  it("treats EXACT 1 in 10⁴ (1e-4) as compliant — text says ‘ne doit pas excéder’", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: 1e-4 });
    expect(result.compliant).toBe(true);
    expect(result.casualtyRisk).toBe(1e-4);
    expect(result.threshold).toBe(1e-4);
    expect(result.rationale).toMatch(/does not exceed/);
  });

  it("treats just-below-threshold (9.99e-5) as compliant", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: 9.99e-5 });
    expect(result.compliant).toBe(true);
    expect(result.casualtyRisk).toBe(9.99e-5);
  });

  it("treats just-above-threshold (1.01e-4) as NON-compliant", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: 1.01e-4 });
    expect(result.compliant).toBe(false);
    expect(result.casualtyRisk).toBe(1.01e-4);
    expect(result.rationale).toMatch(/exceeds/);
  });

  it("treats zero risk as compliant", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: 0 });
    expect(result.compliant).toBe(true);
    expect(result.casualtyRisk).toBe(0);
  });

  it("treats negative figures as non-compliant with invalid-input rationale", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: -1e-5 });
    expect(result.compliant).toBe(false);
    expect(result.rationale).toMatch(/negative/);
  });

  it("treats NaN as missing-figure non-compliant", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: NaN });
    expect(result.compliant).toBe(false);
    expect(result.casualtyRisk).toBeNull();
  });

  it("treats Infinity as missing-figure non-compliant (not finite)", () => {
    const result = calculateCasualtyRiskCompliance({
      casualtyRisk: Number.POSITIVE_INFINITY,
    });
    expect(result.compliant).toBe(false);
    expect(result.casualtyRisk).toBeNull();
  });

  it("treats missing object as non-compliant with missing-assessment rationale", () => {
    const result = calculateCasualtyRiskCompliance(null);
    expect(result.compliant).toBe(false);
    expect(result.rationale).toMatch(/No re-entry risk assessment/);
  });

  it("treats null casualtyRisk field as non-compliant", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: null });
    expect(result.compliant).toBe(false);
    expect(result.rationale).toMatch(/missing numeric/);
  });

  it("treats very small risk (1e-10) as compliant", () => {
    const result = calculateCasualtyRiskCompliance({ casualtyRisk: 1e-10 });
    expect(result.compliant).toBe(true);
    expect(result.casualtyRisk).toBe(1e-10);
  });

  it("ignores extra fields on the assessment blob", () => {
    const result = calculateCasualtyRiskCompliance({
      casualtyRisk: 5e-5,
      methodology: "NASA DAS 3.2.0",
      notes: "Re-evaluated 2026-05-12",
    });
    expect(result.compliant).toBe(true);
  });
});

// ─── Reads ──────────────────────────────────────────────────────────

describe("listLosAuthorisations", () => {
  it("scopes the query to the org", async () => {
    mockLosFindMany.mockResolvedValueOnce([]);
    await listLosAuthorisations("org_42");
    expect(mockLosFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_42" }),
      }),
    );
  });

  it("applies status filter when provided", async () => {
    mockLosFindMany.mockResolvedValueOnce([]);
    await listLosAuthorisations("org_1", { status: "AUTHORISED" });
    expect(mockLosFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: "AUTHORISED",
        }),
      }),
    );
  });
});

describe("getLosAuthorisation", () => {
  it("returns null when org does not own the row (no cross-org leak)", async () => {
    mockLosFindFirst.mockResolvedValueOnce(null);
    const result = await getLosAuthorisation("org_1", "los_from_other_org");
    expect(result).toBeNull();
    expect(mockLosFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "los_from_other_org", organizationId: "org_1" },
      }),
    );
  });
});

// ─── Writes ─────────────────────────────────────────────────────────

describe("createLosAuthorisation", () => {
  it("refuses missing operatorName", async () => {
    await expect(
      createLosAuthorisation({
        organizationId: "org_1",
        operatorName: "  ",
        authorisationType: "LAUNCH",
        missionName: "Ariane 6 VA-261",
        spacecraftClassification: "OPERATIONAL_COMMERCIAL",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/operatorName is required/);
    expect(mockLosCreate).not.toHaveBeenCalled();
  });

  it("refuses missing missionName", async () => {
    await expect(
      createLosAuthorisation({
        organizationId: "org_1",
        operatorName: "ArianeGroup SAS",
        authorisationType: "LAUNCH",
        missionName: "",
        spacecraftClassification: "OPERATIONAL_COMMERCIAL",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/missionName is required/);
  });

  it("refuses when launchVehicle operation belongs to another org", async () => {
    mockOpFindFirst.mockResolvedValueOnce(null);
    await expect(
      createLosAuthorisation({
        organizationId: "org_1",
        operatorName: "ArianeGroup SAS",
        authorisationType: "LAUNCH",
        missionName: "Ariane 6 VA-261",
        spacecraftClassification: "OPERATIONAL_COMMERCIAL",
        launchVehicleId: "op_from_other_org",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Launch-vehicle operation not found/);
    expect(mockLosCreate).not.toHaveBeenCalled();
  });

  it("persists with DRAFT default on happy path", async () => {
    mockLosCreate.mockResolvedValueOnce({ ...baseLos, id: "los_new" });
    const result = await createLosAuthorisation({
      organizationId: "org_1",
      operatorName: "ArianeGroup SAS",
      authorisationType: "LAUNCH",
      missionName: "Ariane 6 VA-261",
      spacecraftClassification: "OPERATIONAL_COMMERCIAL",
      lastActionById: "user_1",
      reEntryRiskAssessment: {
        casualtyRisk: 5e-5,
        methodology: "NASA DAS 3.2.0",
      },
    });
    expect(result.id).toBe("los_new");
    const createCall = mockLosCreate.mock.calls[0]?.[0];
    expect(createCall.data.status).toBe("DRAFT");
    expect(createCall.data.organizationId).toBe("org_1");
    expect(createCall.data.operatorName).toBe("ArianeGroup SAS");
    expect(createCall.data.authorisationType).toBe("LAUNCH");
  });
});

describe("submitToCnes", () => {
  it("rejects non-DRAFT rows", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "AUTHORISED" });
    await expect(submitToCnes("org_1", "los_1", "user_1")).rejects.toThrow(
      /Invalid lifecycle transition AUTHORISED/,
    );
    expect(mockLosUpdate).not.toHaveBeenCalled();
  });

  it("stamps submittedAt on DRAFT → SUBMITTED", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "DRAFT" });
    mockLosUpdate.mockResolvedValueOnce({ ...baseLos, status: "SUBMITTED" });
    await submitToCnes("org_1", "los_1", "user_1");
    const updateCall = mockLosUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("SUBMITTED");
    expect(updateCall.data.submittedAt).toBeInstanceOf(Date);
    expect(updateCall.data.lastActionById).toBe("user_1");
  });

  it("throws on cross-org id", async () => {
    mockLosFindFirst.mockResolvedValueOnce(null);
    await expect(submitToCnes("org_1", "los_other", "user_1")).rejects.toThrow(
      /not found/,
    );
  });
});

describe("recordCnesDecision", () => {
  it("stamps cnesReference + decisionAt on AUTHORISED happy path", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "UNDER_REVIEW" });
    mockLosUpdate.mockResolvedValueOnce({
      ...baseLos,
      status: "AUTHORISED",
    });
    await recordCnesDecision({
      organizationId: "org_1",
      losId: "los_1",
      decision: "AUTHORISED",
      cnesReference: "DGE-LOS-2026-0042",
      lastActionById: "user_1",
    });
    const updateCall = mockLosUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("AUTHORISED");
    expect(updateCall.data.cnesReference).toBe("DGE-LOS-2026-0042");
    expect(updateCall.data.decisionAt).toBeInstanceOf(Date);
  });

  it("rejects non-SUBMITTED/UNDER_REVIEW rows", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "DRAFT" });
    await expect(
      recordCnesDecision({
        organizationId: "org_1",
        losId: "los_1",
        decision: "AUTHORISED",
        cnesReference: "DGE-LOS-2026-0042",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition DRAFT/);
  });

  it("requires non-empty cnesReference", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "SUBMITTED" });
    await expect(
      recordCnesDecision({
        organizationId: "org_1",
        losId: "los_1",
        decision: "AUTHORISED",
        cnesReference: "   ",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/cnesReference is required/);
  });

  it("accepts REFUSED as a valid decision", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "UNDER_REVIEW" });
    mockLosUpdate.mockResolvedValueOnce({ ...baseLos, status: "REFUSED" });
    await recordCnesDecision({
      organizationId: "org_1",
      losId: "los_1",
      decision: "REFUSED",
      cnesReference: "DGE-LOS-2026-0042-REFUSAL",
      lastActionById: "user_1",
      notes: "Casualty risk above R. 331-21 threshold.",
    });
    const updateCall = mockLosUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("REFUSED");
  });
});

describe("markMissionCompleted", () => {
  it("rejects non-AUTHORISED rows", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "SUBMITTED" });
    await expect(
      markMissionCompleted("org_1", "los_1", "user_1"),
    ).rejects.toThrow(/Invalid lifecycle transition SUBMITTED/);
  });

  it("happy path stamps completedAt", async () => {
    mockLosFindFirst.mockResolvedValueOnce({ status: "AUTHORISED" });
    mockLosUpdate.mockResolvedValueOnce({ ...baseLos, status: "COMPLETED" });
    await markMissionCompleted("org_1", "los_1", "user_1");
    const updateCall = mockLosUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("COMPLETED");
    expect(updateCall.data.completedAt).toBeInstanceOf(Date);
  });
});

describe("revokeAuthorisation", () => {
  it("refuses terminal states (COMPLETED)", async () => {
    mockLosFindFirst.mockResolvedValueOnce({
      status: "COMPLETED",
      notes: null,
    });
    await expect(
      revokeAuthorisation("org_1", "los_1", "user_1", "Investigation"),
    ).rejects.toThrow(/already terminal/);
  });

  it("refuses empty reason", async () => {
    mockLosFindFirst.mockResolvedValueOnce({
      status: "AUTHORISED",
      notes: null,
    });
    await expect(
      revokeAuthorisation("org_1", "los_1", "user_1", "  "),
    ).rejects.toThrow(/reason is required/);
  });

  it("appends reason to notes on happy path", async () => {
    mockLosFindFirst.mockResolvedValueOnce({
      status: "AUTHORISED",
      notes: "Existing notes",
    });
    mockLosUpdate.mockResolvedValueOnce({ ...baseLos, status: "REVOKED" });
    await revokeAuthorisation(
      "org_1",
      "los_1",
      "user_1",
      "Mid-mission DGE pull",
    );
    const updateCall = mockLosUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("REVOKED");
    expect(updateCall.data.notes).toContain("Existing notes");
    expect(updateCall.data.notes).toContain("[REVOKED] Mid-mission DGE pull");
  });
});

describe("listExpiring", () => {
  it("returns [] for non-positive days", async () => {
    expect(await listExpiring("org_1", 0)).toEqual([]);
    expect(await listExpiring("org_1", -7)).toEqual([]);
    expect(mockLosFindMany).not.toHaveBeenCalled();
  });

  it("queries AUTHORISED rows within validUntil window", async () => {
    mockLosFindMany.mockResolvedValueOnce([]);
    await listExpiring("org_1", 30);
    const call = mockLosFindMany.mock.calls[0]?.[0];
    expect(call.where.organizationId).toBe("org_1");
    expect(call.where.status).toBe("AUTHORISED");
    expect(call.where.validUntil.gte).toBeInstanceOf(Date);
    expect(call.where.validUntil.lte).toBeInstanceOf(Date);
    // window length ~= 30 days
    const span =
      (call.where.validUntil.lte as Date).getTime() -
      (call.where.validUntil.gte as Date).getTime();
    expect(span).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
  });
});
