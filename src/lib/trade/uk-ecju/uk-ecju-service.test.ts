/**
 * Tests for src/lib/trade/uk-ecju/uk-ecju-service.ts (Z37-UK).
 *
 * Coverage:
 *   1.  listUkEcjuLicenses org-scopes the query
 *   2.  listUkEcjuLicenses applies status filter
 *   3.  listUkEcjuLicenses applies licenseType filter
 *   4.  getUkEcjuLicense returns null on cross-org id
 *   5.  createUkEcjuLicense rejects empty applicantName
 *   6.  createUkEcjuLicense rejects SIEL without endUserName
 *   7.  createUkEcjuLicense applies SIEL 2-yr validity default
 *   8.  createUkEcjuLicense applies OIEL 3-yr validity default
 *   9.  createUkEcjuLicense leaves OGEL validUntil null
 *  10.  createUkEcjuLicense uppercases destinationCountries
 *  11.  transitionUkEcjuStatus: DRAFT → SUBMITTED happy path
 *  12.  transitionUkEcjuStatus: SUBMITTED → APPROVED requires ecjuReference
 *  13.  transitionUkEcjuStatus: SUBMITTED → APPROVED accepts existing ref
 *  14.  transitionUkEcjuStatus: DRAFT → APPROVED rejected (no skip)
 *  15.  transitionUkEcjuStatus: REJECTED terminal — no further moves
 *  16.  transitionUkEcjuStatus: cross-org id throws
 *  17.  recordDrawDown rejects DRAFT licence
 *  18.  recordDrawDown rejects negative value
 *  19.  recordDrawDown increments total + stays APPROVED below cap
 *  20.  recordDrawDown flips to EXHAUSTED at cap
 *  21.  findCoveringLicenses returns matching SIEL
 *  22.  findCoveringLicenses filters out wrong destination
 *  23.  findCoveringLicenses filters out wrong control-list entry
 *  24.  findCoveringLicenses matches OGEL with empty controlList
 *  25.  findCoveringLicenses filters SIEL by endUser
 *  26.  findCoveringLicenses excludes licence with insufficient cap headroom
 *  27.  defaultValidUntilFor returns correct dates per type
 *  28.  isValidUkEcjuTransition graph correctness
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindMany,
  mockFindFirst,
  mockCreate,
  mockUpdate,
  mockUpdateMany,
  mockFindFirstOrThrow,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockFindFirstOrThrow: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const tradeUkEcjuLicense = {
    findMany: mockFindMany,
    findFirst: mockFindFirst,
    create: mockCreate,
    update: mockUpdate,
    updateMany: mockUpdateMany,
    findFirstOrThrow: mockFindFirstOrThrow,
  };
  return {
    prisma: {
      tradeUkEcjuLicense,
      // recordDrawDown wraps its read-guard-write in a transaction; the mock
      // runs the callback with the same mocked client as `tx`.
      $transaction: async (fn: (tx: unknown) => unknown) =>
        fn({ tradeUkEcjuLicense }),
    },
  };
});

import {
  listUkEcjuLicenses,
  getUkEcjuLicense,
  createUkEcjuLicense,
  transitionUkEcjuStatus,
  recordDrawDown,
  findCoveringLicenses,
  defaultValidUntilFor,
  isValidUkEcjuTransition,
} from "./uk-ecju-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseLicense = {
  id: "lic_1",
  organizationId: "org_1",
  applicantName: "Caelex UK Ltd.",
  applicantAddress: "10 Downing St, London SW1A 2AA",
  licenseType: "SIEL" as const,
  ecjuReference: null,
  controlListEntries: ["PL5002A"],
  destinationCountries: ["IN"],
  endUserName: "ISRO",
  endUserAddress: null,
  endUseDescription: null,
  validFrom: null,
  validUntil: null,
  status: "DRAFT" as const,
  drawnDownValueGbp: BigInt(0),
  capValueGbp: null,
  createdById: "user_1",
  notes: null,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

describe("listUkEcjuLicenses", () => {
  it("org-scopes the query and includes creator", async () => {
    mockFindMany.mockResolvedValue([baseLicense]);
    const result = await listUkEcjuLicenses("org_1");
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      orderBy: { updatedAt: "desc" },
      include: { createdBy: expect.any(Object) },
    });
    expect(result).toHaveLength(1);
  });

  it("applies status filter", async () => {
    mockFindMany.mockResolvedValue([]);
    await listUkEcjuLicenses("org_1", { status: "APPROVED" });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", status: "APPROVED" },
      }),
    );
  });

  it("applies licenseType filter", async () => {
    mockFindMany.mockResolvedValue([]);
    await listUkEcjuLicenses("org_1", { licenseType: "OIEL" });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", licenseType: "OIEL" },
      }),
    );
  });
});

describe("getUkEcjuLicense", () => {
  it("returns null when id doesn't belong to the org", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await getUkEcjuLicense("org_1", "lic_otherorg");
    expect(result).toBeNull();
  });
});

describe("createUkEcjuLicense", () => {
  it("rejects empty applicantName", async () => {
    await expect(
      createUkEcjuLicense({
        organizationId: "org_1",
        applicantName: "  ",
        applicantAddress: "addr",
        licenseType: "SIEL",
        endUserName: "ISRO",
      }),
    ).rejects.toThrow(/applicant name/i);
  });

  it("rejects SIEL without endUserName", async () => {
    await expect(
      createUkEcjuLicense({
        organizationId: "org_1",
        applicantName: "Caelex UK",
        applicantAddress: "addr",
        licenseType: "SIEL",
      }),
    ).rejects.toThrow(/end-user name/i);
  });

  it("rejects SIEL_TC without endUserName", async () => {
    await expect(
      createUkEcjuLicense({
        organizationId: "org_1",
        applicantName: "Caelex UK",
        applicantAddress: "addr",
        licenseType: "SIEL_TC",
      }),
    ).rejects.toThrow(/end-user name/i);
  });

  it("applies SIEL 2-year validity default", async () => {
    mockCreate.mockResolvedValue(baseLicense);
    const from = new Date("2026-05-01T00:00:00Z");
    await createUkEcjuLicense({
      organizationId: "org_1",
      applicantName: "Caelex UK",
      applicantAddress: "addr",
      licenseType: "SIEL",
      endUserName: "ISRO",
      validFrom: from,
    });
    const call = mockCreate.mock.calls[0][0];
    const validUntil = call.data.validUntil as Date;
    expect(validUntil.getFullYear()).toBe(2028);
  });

  it("applies OIEL 3-year validity default", async () => {
    mockCreate.mockResolvedValue(baseLicense);
    await createUkEcjuLicense({
      organizationId: "org_1",
      applicantName: "Caelex UK",
      applicantAddress: "addr",
      licenseType: "OIEL",
    });
    const call = mockCreate.mock.calls[0][0];
    const validUntil = call.data.validUntil as Date;
    const now = new Date();
    expect(validUntil.getFullYear()).toBe(now.getFullYear() + 3);
  });

  it("leaves OGEL validUntil null", async () => {
    mockCreate.mockResolvedValue(baseLicense);
    await createUkEcjuLicense({
      organizationId: "org_1",
      applicantName: "Caelex UK",
      applicantAddress: "addr",
      licenseType: "OGEL",
    });
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.validUntil).toBeNull();
  });

  it("uppercases destinationCountries", async () => {
    mockCreate.mockResolvedValue(baseLicense);
    await createUkEcjuLicense({
      organizationId: "org_1",
      applicantName: "Caelex UK",
      applicantAddress: "addr",
      licenseType: "SIEL",
      endUserName: "ISRO",
      destinationCountries: ["in", "us", "de"],
    });
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.destinationCountries).toEqual(["IN", "US", "DE"]);
  });
});

describe("transitionUkEcjuStatus", () => {
  it("DRAFT → SUBMITTED happy path", async () => {
    mockFindFirst.mockResolvedValue({ ...baseLicense, status: "DRAFT" });
    mockUpdate.mockResolvedValue({ ...baseLicense, status: "SUBMITTED" });
    const result = await transitionUkEcjuStatus({
      organizationId: "org_1",
      licenseId: "lic_1",
      nextStatus: "SUBMITTED",
    });
    expect(result.status).toBe("SUBMITTED");
  });

  it("SUBMITTED → APPROVED requires ecjuReference", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      status: "SUBMITTED",
      ecjuReference: null,
    });
    await expect(
      transitionUkEcjuStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "APPROVED",
      }),
    ).rejects.toThrow(/ECJU reference/i);
  });

  it("SUBMITTED → APPROVED accepts ecjuReference on transition", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      status: "SUBMITTED",
      ecjuReference: null,
    });
    mockUpdate.mockResolvedValue({
      ...baseLicense,
      status: "APPROVED",
      ecjuReference: "GBSIEL/2026/0012345",
    });
    const result = await transitionUkEcjuStatus({
      organizationId: "org_1",
      licenseId: "lic_1",
      nextStatus: "APPROVED",
      ecjuReference: "GBSIEL/2026/0012345",
    });
    expect(result.status).toBe("APPROVED");
  });

  it("DRAFT → APPROVED is rejected (no skipping)", async () => {
    mockFindFirst.mockResolvedValue({ ...baseLicense, status: "DRAFT" });
    await expect(
      transitionUkEcjuStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "APPROVED",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("REJECTED is terminal — no further moves", async () => {
    mockFindFirst.mockResolvedValue({ ...baseLicense, status: "REJECTED" });
    await expect(
      transitionUkEcjuStatus({
        organizationId: "org_1",
        licenseId: "lic_1",
        nextStatus: "REVOKED",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("throws on cross-org licence id", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(
      transitionUkEcjuStatus({
        organizationId: "org_1",
        licenseId: "lic_otherorg",
        nextStatus: "SUBMITTED",
      }),
    ).rejects.toThrow(/not found in this organisation/);
  });
});

describe("recordDrawDown", () => {
  it("rejects negative value", async () => {
    await expect(
      recordDrawDown("org_1", "lic_1", "op_1", -BigInt(100)),
    ).rejects.toThrow(/non-negative/);
  });

  it("rejects draw-down against DRAFT licence", async () => {
    mockFindFirst.mockResolvedValue({ ...baseLicense, status: "DRAFT" });
    await expect(
      recordDrawDown("org_1", "lic_1", "op_1", BigInt(100)),
    ).rejects.toThrow(/Cannot draw down against DRAFT/);
  });

  it("increments running total below the cap (stays APPROVED)", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      status: "APPROVED",
      drawnDownValueGbp: BigInt(1000),
      capValueGbp: BigInt(10000),
    });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindFirstOrThrow.mockResolvedValue({
      drawnDownValueGbp: BigInt(3000),
      capValueGbp: BigInt(10000),
    });
    mockUpdate.mockResolvedValue({
      ...baseLicense,
      status: "APPROVED",
      drawnDownValueGbp: BigInt(3000),
    });
    await recordDrawDown("org_1", "lic_1", "op_99", BigInt(2000));
    // increment applied atomically via a cap-guarded updateMany …
    const um = mockUpdateMany.mock.calls[0][0];
    expect(um.data.drawnDownValueGbp).toEqual({ increment: BigInt(2000) });
    expect(um.where.drawnDownValueGbp).toEqual({ lte: BigInt(8000) });
    // … post-increment total (3000 < 10000) keeps it APPROVED.
    expect(mockUpdate.mock.calls[0][0].data.status).toBe("APPROVED");
  });

  it("flips to EXHAUSTED when cap reached", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      status: "APPROVED",
      drawnDownValueGbp: BigInt(9000),
      capValueGbp: BigInt(10000),
    });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockFindFirstOrThrow.mockResolvedValue({
      drawnDownValueGbp: BigInt(10000),
      capValueGbp: BigInt(10000),
    });
    mockUpdate.mockResolvedValue({ ...baseLicense, status: "EXHAUSTED" });
    await recordDrawDown("org_1", "lic_1", "op_99", BigInt(1000));
    expect(mockUpdate.mock.calls[0][0].data.status).toBe("EXHAUSTED");
  });

  it("rejects an over-cap draw-down (no silent overdraw)", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseLicense,
      status: "APPROVED",
      drawnDownValueGbp: BigInt(9000),
      capValueGbp: BigInt(10000),
    });
    // cap-guarded updateMany matches 0 rows → headroom exceeded by a
    // concurrent draw or this single over-cap draw.
    mockUpdateMany.mockResolvedValue({ count: 0 });
    await expect(
      recordDrawDown("org_1", "lic_1", "op_99", BigInt(2000)),
    ).rejects.toThrow(/exceed licence cap/);
    // never writes the over-cap total
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws on cross-org licence id", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(
      recordDrawDown("org_1", "lic_otherorg", "op_1", BigInt(100)),
    ).rejects.toThrow(/not found in this organisation/);
  });
});

describe("findCoveringLicenses", () => {
  const approvedSiel = {
    ...baseLicense,
    status: "APPROVED" as const,
    licenseType: "SIEL" as const,
    controlListEntries: ["PL5002A"],
    destinationCountries: ["IN"],
    endUserName: "ISRO Bangalore",
    capValueGbp: BigInt(100000),
    drawnDownValueGbp: BigInt(0),
  };

  it("returns matching SIEL on exact control-list + destination match", async () => {
    mockFindMany.mockResolvedValue([approvedSiel]);
    const result = await findCoveringLicenses("org_1", {
      controlListEntry: "PL5002A",
      destination: "IN",
      endUser: "ISRO",
    });
    expect(result).toHaveLength(1);
  });

  it("Prisma query filters destination via array contains", async () => {
    mockFindMany.mockResolvedValue([]);
    await findCoveringLicenses("org_1", {
      controlListEntry: "PL5002A",
      destination: "ru",
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          destinationCountries: { has: "RU" },
        }),
      }),
    );
  });

  it("filters out wrong control-list entry", async () => {
    mockFindMany.mockResolvedValue([approvedSiel]);
    const result = await findCoveringLicenses("org_1", {
      controlListEntry: "ML10",
      destination: "IN",
    });
    expect(result).toHaveLength(0);
  });

  it("matches prefix subentry (PL5002A covers PL5002A.1)", async () => {
    mockFindMany.mockResolvedValue([approvedSiel]);
    const result = await findCoveringLicenses("org_1", {
      controlListEntry: "PL5002A.1",
      destination: "IN",
    });
    expect(result).toHaveLength(1);
  });

  it("matches OGEL with empty controlListEntries (category-page scope)", async () => {
    const ogel = {
      ...baseLicense,
      status: "APPROVED" as const,
      licenseType: "OGEL" as const,
      controlListEntries: [],
      destinationCountries: ["DE"],
    };
    mockFindMany.mockResolvedValue([ogel]);
    const result = await findCoveringLicenses("org_1", {
      controlListEntry: "ANYTHING",
      destination: "DE",
    });
    expect(result).toHaveLength(1);
  });

  it("filters SIEL by endUser substring", async () => {
    mockFindMany.mockResolvedValue([approvedSiel]);
    const result = await findCoveringLicenses("org_1", {
      controlListEntry: "PL5002A",
      destination: "IN",
      endUser: "Lockheed",
    });
    expect(result).toHaveLength(0);
  });

  it("excludes licence with insufficient cap headroom", async () => {
    mockFindMany.mockResolvedValue([
      {
        ...approvedSiel,
        capValueGbp: BigInt(10000),
        drawnDownValueGbp: BigInt(9500),
      },
    ]);
    const result = await findCoveringLicenses("org_1", {
      controlListEntry: "PL5002A",
      destination: "IN",
      valueGbp: BigInt(1000),
    });
    expect(result).toHaveLength(0);
  });

  it("includes licence with sufficient cap headroom", async () => {
    mockFindMany.mockResolvedValue([approvedSiel]);
    const result = await findCoveringLicenses("org_1", {
      controlListEntry: "PL5002A",
      destination: "IN",
      valueGbp: BigInt(50000),
    });
    expect(result).toHaveLength(1);
  });
});

describe("defaultValidUntilFor", () => {
  it("SIEL → 2 years from `from`", () => {
    const from = new Date("2026-01-01");
    const out = defaultValidUntilFor("SIEL", from);
    expect(out?.getFullYear()).toBe(2028);
  });

  it("OIEL → 3 years from `from`", () => {
    const from = new Date("2026-01-01");
    const out = defaultValidUntilFor("OIEL", from);
    expect(out?.getFullYear()).toBe(2029);
  });

  it("SIEL_TC → 1 year from `from`", () => {
    const from = new Date("2026-01-01");
    const out = defaultValidUntilFor("SIEL_TC", from);
    expect(out?.getFullYear()).toBe(2027);
  });

  it("OITCL → 2 years from `from`", () => {
    const from = new Date("2026-01-01");
    const out = defaultValidUntilFor("OITCL", from);
    expect(out?.getFullYear()).toBe(2028);
  });

  it("OGEL → null (indefinite)", () => {
    expect(defaultValidUntilFor("OGEL")).toBeNull();
  });
});

describe("isValidUkEcjuTransition", () => {
  it("rejects same-state self-loops", () => {
    expect(isValidUkEcjuTransition("DRAFT", "DRAFT")).toBe(false);
    expect(isValidUkEcjuTransition("APPROVED", "APPROVED")).toBe(false);
  });

  it("DRAFT → SUBMITTED + REVOKED allowed", () => {
    expect(isValidUkEcjuTransition("DRAFT", "SUBMITTED")).toBe(true);
    expect(isValidUkEcjuTransition("DRAFT", "REVOKED")).toBe(true);
  });

  it("DRAFT → APPROVED rejected (no skipping)", () => {
    expect(isValidUkEcjuTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("SUBMITTED → APPROVED|REJECTED|REVOKED allowed", () => {
    expect(isValidUkEcjuTransition("SUBMITTED", "APPROVED")).toBe(true);
    expect(isValidUkEcjuTransition("SUBMITTED", "REJECTED")).toBe(true);
    expect(isValidUkEcjuTransition("SUBMITTED", "REVOKED")).toBe(true);
  });

  it("APPROVED → EXPIRED|REVOKED|EXHAUSTED allowed", () => {
    expect(isValidUkEcjuTransition("APPROVED", "EXPIRED")).toBe(true);
    expect(isValidUkEcjuTransition("APPROVED", "REVOKED")).toBe(true);
    expect(isValidUkEcjuTransition("APPROVED", "EXHAUSTED")).toBe(true);
  });

  it("REJECTED is terminal", () => {
    expect(isValidUkEcjuTransition("REJECTED", "REVOKED")).toBe(false);
    expect(isValidUkEcjuTransition("REJECTED", "EXPIRED")).toBe(false);
  });

  it("EXPIRED is terminal", () => {
    expect(isValidUkEcjuTransition("EXPIRED", "REVOKED")).toBe(false);
  });

  it("EXHAUSTED → EXPIRED allowed (cron-set when validUntil passes)", () => {
    expect(isValidUkEcjuTransition("EXHAUSTED", "EXPIRED")).toBe(true);
  });
});
