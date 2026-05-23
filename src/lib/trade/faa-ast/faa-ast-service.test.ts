/**
 * Tests for src/lib/trade/faa-ast/faa-ast-service.ts (Z38-US).
 *
 * Coverage:
 *   listFaaAstLicenses
 *     1.  org-scopes the query
 *     2.  applies status filter
 *     3.  applies licenseType filter
 *   getFaaAstLicense
 *     4.  returns null on cross-org id
 *   createFaaAstLicense
 *     5.  rejects empty operatorName
 *     6.  rejects empty launchSite
 *     7.  rejects Ec > 1 (probabilities can't exceed 1)
 *     8.  rejects negative Ec
 *     9.  applies PART_450_LAUNCH 5-yr validity default
 *    10.  applies PART_435_REENTRY_REUSABLE 2-yr validity default
 *   transitionFaaAstStatus
 *    11.  DRAFT → PRE_APP_CONSULTATION happy path
 *    12.  DRAFT → PRE_APP_CONSULTATION refused when Ec is null
 *    13.  DRAFT → PRE_APP_CONSULTATION refused when Ec > 1e-4
 *    14.  UNDER_REVIEW → APPROVED requires faaReference
 *    15.  UNDER_REVIEW → APPROVED auto-defaults validUntil
 *    16.  DRAFT → APPROVED rejected (no skip)
 *    17.  REJECTED terminal — no further moves
 *    18.  Cross-org id throws
 *   calculateEcCompliance (BOUNDARY TESTS — § 450.101)
 *    19.  Ec = 1.0e-4 → compliant (exact ceiling)
 *    20.  Ec = 9.99e-5 → compliant (just below)
 *    21.  Ec = 1.01e-4 → non-compliant (just above)
 *    22.  Ec = 0 → compliant
 *    23.  Decomposed: pf × pcf × n produces correct Ec
 *    24.  Negative Ec → non-compliant
 *    25.  NaN Ec → non-compliant
 *   defaultValidUntilFor
 *    26.  Returns correct dates per type
 *   isValidFaaAstTransition
 *    27.  Forward path passes through all six stages
 *    28.  REJECTED is terminal
 *    29.  Self-transitions rejected
 *    30.  Skipping NEPA review rejected
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany, mockFindFirst, mockCreate, mockUpdate } = vi.hoisted(
  () => ({
    mockFindMany: vi.fn(),
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeFaaAstLicense: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

import {
  listFaaAstLicenses,
  getFaaAstLicense,
  createFaaAstLicense,
  transitionFaaAstStatus,
  calculateEcCompliance,
  defaultValidUntilFor,
  isValidFaaAstTransition,
  EC_THRESHOLD_PER_MISSION,
} from "./faa-ast-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseLicense = {
  id: "lic_1",
  organizationId: "org_1",
  operatorName: "SpaceX Texas",
  operatorAddress: "Boca Chica, TX 78521",
  licenseType: "PART_450_LAUNCH" as const,
  faaReference: null,
  launchSite: "Boca Chica (Starbase)",
  vehicleName: "Starship",
  vehicleType: "ORBITAL" as const,
  maximumProbabilityOfCasualtyEc: 5e-5,
  thirdPartyLiabilityCapUsdCents: null,
  financialResponsibilityType: null,
  validFrom: null,
  validUntil: null,
  status: "DRAFT" as const,
  createdById: "user_1",
  notes: null,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

// ─── listFaaAstLicenses ─────────────────────────────────────────────

describe("listFaaAstLicenses", () => {
  it("org-scopes the query and includes creator", async () => {
    mockFindMany.mockResolvedValue([baseLicense]);
    const result = await listFaaAstLicenses("org_1");
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    expect(result).toHaveLength(1);
  });

  it("applies status filter when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    await listFaaAstLicenses("org_1", { status: "APPROVED" });
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where.status).toBe("APPROVED");
  });

  it("applies licenseType filter when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    await listFaaAstLicenses("org_1", { licenseType: "PART_450_LAUNCH" });
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where.licenseType).toBe("PART_450_LAUNCH");
  });
});

// ─── getFaaAstLicense ───────────────────────────────────────────────

describe("getFaaAstLicense", () => {
  it("returns null on cross-org id", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await getFaaAstLicense("org_other", "lic_1");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "lic_1", organizationId: "org_other" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  });
});

// ─── createFaaAstLicense ────────────────────────────────────────────

describe("createFaaAstLicense", () => {
  it("rejects empty operatorName", async () => {
    await expect(
      createFaaAstLicense({
        organizationId: "org_1",
        operatorName: "  ",
        operatorAddress: "Some addr",
        licenseType: "PART_450_LAUNCH",
        launchSite: "VSFB SLC-4E",
        vehicleName: "Falcon 9",
        vehicleType: "ORBITAL",
      }),
    ).rejects.toThrow(/operator name is required/i);
  });

  it("rejects empty launchSite", async () => {
    await expect(
      createFaaAstLicense({
        organizationId: "org_1",
        operatorName: "SpaceX",
        operatorAddress: "Hawthorne CA",
        licenseType: "PART_450_LAUNCH",
        launchSite: "  ",
        vehicleName: "Falcon 9",
        vehicleType: "ORBITAL",
      }),
    ).rejects.toThrow(/launch site is required/i);
  });

  it("rejects Ec > 1 (probabilities can't exceed 1)", async () => {
    await expect(
      createFaaAstLicense({
        organizationId: "org_1",
        operatorName: "SpaceX",
        operatorAddress: "Hawthorne CA",
        licenseType: "PART_450_LAUNCH",
        launchSite: "VSFB",
        vehicleName: "Falcon 9",
        vehicleType: "ORBITAL",
        maximumProbabilityOfCasualtyEc: 1.5,
      }),
    ).rejects.toThrow(/probability/i);
  });

  it("rejects negative Ec", async () => {
    await expect(
      createFaaAstLicense({
        organizationId: "org_1",
        operatorName: "SpaceX",
        operatorAddress: "Hawthorne CA",
        licenseType: "PART_450_LAUNCH",
        launchSite: "VSFB",
        vehicleName: "Falcon 9",
        vehicleType: "ORBITAL",
        maximumProbabilityOfCasualtyEc: -0.0001,
      }),
    ).rejects.toThrow(/non-negative/i);
  });

  it("applies PART_450_LAUNCH 5-yr validity default", async () => {
    mockCreate.mockResolvedValue({ ...baseLicense, validUntil: new Date() });
    const start = new Date("2026-05-23");
    vi.useFakeTimers();
    vi.setSystemTime(start);
    await createFaaAstLicense({
      organizationId: "org_1",
      operatorName: "SpaceX",
      operatorAddress: "Hawthorne CA",
      licenseType: "PART_450_LAUNCH",
      launchSite: "VSFB",
      vehicleName: "Falcon 9",
      vehicleType: "ORBITAL",
    });
    const args = mockCreate.mock.calls[0][0];
    expect(args.data.validUntil).toBeInstanceOf(Date);
    // 5-year default → 2031-05-23
    expect((args.data.validUntil as Date).getFullYear()).toBe(2031);
    vi.useRealTimers();
  });

  it("applies PART_435_REENTRY_REUSABLE 2-yr validity default", async () => {
    mockCreate.mockResolvedValue({ ...baseLicense });
    const start = new Date("2026-05-23");
    vi.useFakeTimers();
    vi.setSystemTime(start);
    await createFaaAstLicense({
      organizationId: "org_1",
      operatorName: "Blue Origin",
      operatorAddress: "Kent WA",
      licenseType: "PART_435_REENTRY_REUSABLE",
      launchSite: "Corn Ranch, TX",
      vehicleName: "New Shepard",
      vehicleType: "SUB_ORBITAL",
    });
    const args = mockCreate.mock.calls[0][0];
    expect((args.data.validUntil as Date).getFullYear()).toBe(2028);
    vi.useRealTimers();
  });
});

// ─── transitionFaaAstStatus ─────────────────────────────────────────

describe("transitionFaaAstStatus", () => {
  it("DRAFT → PRE_APP_CONSULTATION happy path with valid Ec", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      maximumProbabilityOfCasualtyEc: 5e-5,
    });
    mockUpdate.mockResolvedValue({
      ...baseLicense,
      status: "PRE_APP_CONSULTATION",
    });
    const result = await transitionFaaAstStatus({
      organizationId: "org_1",
      licenseId: "lic_1",
      nextStatus: "PRE_APP_CONSULTATION",
    });
    expect(result.status).toBe("PRE_APP_CONSULTATION");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("DRAFT → PRE_APP_CONSULTATION refused when Ec is null", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      maximumProbabilityOfCasualtyEc: null,
    });
    await expect(
      transitionFaaAstStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "PRE_APP_CONSULTATION",
      }),
    ).rejects.toThrow(/§ 450\.101/);
  });

  it("DRAFT → PRE_APP_CONSULTATION refused when Ec > 1e-4", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      maximumProbabilityOfCasualtyEc: 2e-4,
    });
    await expect(
      transitionFaaAstStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "PRE_APP_CONSULTATION",
      }),
    ).rejects.toThrow(/exceeds/);
  });

  it("UNDER_REVIEW → APPROVED requires faaReference", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      status: "UNDER_REVIEW",
      faaReference: null,
    });
    await expect(
      transitionFaaAstStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "APPROVED",
      }),
    ).rejects.toThrow(/FAA reference/);
  });

  it("UNDER_REVIEW → APPROVED auto-defaults validUntil if missing", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      status: "UNDER_REVIEW",
      faaReference: "LRLO 22-119",
      validUntil: null,
    });
    mockUpdate.mockResolvedValue({ ...baseLicense, status: "APPROVED" });
    await transitionFaaAstStatus({
      organizationId: "org_1",
      licenseId: "lic_1",
      nextStatus: "APPROVED",
    });
    const args = mockUpdate.mock.calls[0][0];
    expect(args.data.validUntil).toBeInstanceOf(Date);
  });

  it("DRAFT → APPROVED rejected (cannot skip the funnel)", async () => {
    mockFindFirst.mockResolvedValue({ ...baseLicense, status: "DRAFT" });
    await expect(
      transitionFaaAstStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "APPROVED",
      }),
    ).rejects.toThrow(/invalid lifecycle transition/i);
  });

  it("REJECTED is terminal — no further moves", async () => {
    mockFindFirst.mockResolvedValue({ ...baseLicense, status: "REJECTED" });
    await expect(
      transitionFaaAstStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "APPROVED",
      }),
    ).rejects.toThrow(/invalid lifecycle transition/i);
  });

  it("Cross-org id throws", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(
      transitionFaaAstStatus({
        organizationId: "org_other",
        licenseId: "lic_1",
        nextStatus: "PRE_APP_CONSULTATION",
      }),
    ).rejects.toThrow(/not found/);
  });
});

// ─── calculateEcCompliance (§ 450.101 boundary tests) ───────────────

describe("calculateEcCompliance", () => {
  it("Ec = 1.0e-4 → compliant (exact ceiling, inclusive)", () => {
    const r = calculateEcCompliance({ ec: 1.0e-4 });
    expect(r.compliant).toBe(true);
    expect(r.ec).toBe(1.0e-4);
    expect(r.threshold).toBe(EC_THRESHOLD_PER_MISSION);
    expect(r.marginRatio).toBe(1);
  });

  it("Ec = 9.99e-5 → compliant (just below ceiling)", () => {
    const r = calculateEcCompliance({ ec: 9.99e-5 });
    expect(r.compliant).toBe(true);
    expect(r.marginRatio).toBeLessThan(1);
    expect(r.reason).toMatch(/compliant/);
  });

  it("Ec = 1.01e-4 → non-compliant (just above ceiling)", () => {
    const r = calculateEcCompliance({ ec: 1.01e-4 });
    expect(r.compliant).toBe(false);
    expect(r.marginRatio).toBeGreaterThan(1);
    expect(r.reason).toMatch(/violation/);
  });

  it("Ec = 0 → compliant (no casualty risk)", () => {
    const r = calculateEcCompliance({ ec: 0 });
    expect(r.compliant).toBe(true);
    expect(r.ec).toBe(0);
    expect(r.marginRatio).toBe(0);
  });

  it("Decomposed: pf × pcf × n produces correct Ec", () => {
    // 1% failure × 0.1% casualty given failure × 10 people = 1e-6
    const r = calculateEcCompliance({
      probabilityOfFailure: 0.01,
      conditionalProbabilityOfCasualty: 0.001,
      populationAtRisk: 10,
    });
    expect(r.ec).toBeCloseTo(1e-4, 10);
    expect(r.compliant).toBe(true);
  });

  it("Negative Ec → non-compliant", () => {
    const r = calculateEcCompliance({ ec: -0.0001 });
    expect(r.compliant).toBe(false);
    expect(r.reason).toMatch(/non-negative/);
  });

  it("NaN Ec → non-compliant", () => {
    const r = calculateEcCompliance({ ec: Number.NaN });
    expect(r.compliant).toBe(false);
    expect(r.reason).toMatch(/finite/);
  });
});

// ─── defaultValidUntilFor ───────────────────────────────────────────

describe("defaultValidUntilFor", () => {
  it("returns 5-yr offset for PART_450_LAUNCH", () => {
    const from = new Date("2026-05-23");
    const out = defaultValidUntilFor("PART_450_LAUNCH", from);
    expect(out.getFullYear()).toBe(2031);
    expect(out.getMonth()).toBe(4); // May
    expect(out.getDate()).toBe(23);
  });

  it("returns 5-yr offset for PART_450_VEHICLE_OPERATOR", () => {
    const from = new Date("2026-05-23");
    const out = defaultValidUntilFor("PART_450_VEHICLE_OPERATOR", from);
    expect(out.getFullYear()).toBe(2031);
  });

  it("returns 2-yr offset for PART_435_REENTRY_REUSABLE", () => {
    const from = new Date("2026-05-23");
    const out = defaultValidUntilFor("PART_435_REENTRY_REUSABLE", from);
    expect(out.getFullYear()).toBe(2028);
  });
});

// ─── isValidFaaAstTransition ────────────────────────────────────────

describe("isValidFaaAstTransition", () => {
  it("forward path passes through all six stages", () => {
    expect(isValidFaaAstTransition("DRAFT", "PRE_APP_CONSULTATION")).toBe(true);
    expect(
      isValidFaaAstTransition("PRE_APP_CONSULTATION", "APPLICATION_SUBMITTED"),
    ).toBe(true);
    expect(
      isValidFaaAstTransition("APPLICATION_SUBMITTED", "ENVIRONMENTAL_REVIEW"),
    ).toBe(true);
    expect(
      isValidFaaAstTransition("ENVIRONMENTAL_REVIEW", "UNDER_REVIEW"),
    ).toBe(true);
    expect(isValidFaaAstTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(isValidFaaAstTransition("APPROVED", "EXPIRED")).toBe(true);
  });

  it("REJECTED is terminal — no escape", () => {
    expect(isValidFaaAstTransition("REJECTED", "APPROVED")).toBe(false);
    expect(isValidFaaAstTransition("REJECTED", "DRAFT")).toBe(false);
  });

  it("self-transitions rejected", () => {
    expect(isValidFaaAstTransition("DRAFT", "DRAFT")).toBe(false);
    expect(isValidFaaAstTransition("APPROVED", "APPROVED")).toBe(false);
  });

  it("skipping NEPA environmental review is rejected", () => {
    // APPLICATION_SUBMITTED → UNDER_REVIEW (skipping NEPA) — not allowed
    expect(
      isValidFaaAstTransition("APPLICATION_SUBMITTED", "UNDER_REVIEW"),
    ).toBe(false);
    // PRE_APP_CONSULTATION → ENVIRONMENTAL_REVIEW (skip filing) — not allowed
    expect(
      isValidFaaAstTransition("PRE_APP_CONSULTATION", "ENVIRONMENTAL_REVIEW"),
    ).toBe(false);
  });
});
