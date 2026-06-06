/**
 * Tests for src/lib/products.ts — the OrganizationProductAccess helpers
 * introduced in Caelex Trade Sprint T1.
 *
 * Coverage:
 *   1.  hasProductAccess returns false when no row exists
 *   2.  hasProductAccess returns true for ACTIVE row
 *   3.  hasProductAccess returns true for TRIAL row within validity
 *   4.  hasProductAccess returns false for SUSPENDED row
 *   5.  hasProductAccess returns false for EXPIRED row
 *   6.  hasProductAccess returns false for ACTIVE row past expiresAt
 *   7.  getActiveProducts returns multiple products for multi-product org
 *   8.  getActiveProducts excludes expired trials
 *   9.  grantProductAccess re-activates a previously SUSPENDED row
 *  10.  revokeProductAccess is a no-op on non-existent row (no throw)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindMany, mockUpsert, mockUpdateMany } = vi.hoisted(
  () => ({
    mockFindUnique: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpsert: vi.fn(),
    mockUpdateMany: vi.fn(),
  }),
);

vi.mock("./prisma", () => ({
  prisma: {
    organizationProductAccess: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      upsert: mockUpsert,
      updateMany: mockUpdateMany,
    },
  },
}));

import {
  hasProductAccess,
  getActiveProducts,
  grantProductAccess,
  revokeProductAccess,
} from "./products";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── hasProductAccess ────────────────────────────────────────────────────

describe("hasProductAccess", () => {
  it("returns false when no access row exists", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await hasProductAccess("org_1", "TRADE");

    expect(result).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        organizationId_product: { organizationId: "org_1", product: "TRADE" },
      },
      select: { status: true, expiresAt: true },
    });
  });

  it("returns true for an ACTIVE row with no expiresAt", async () => {
    mockFindUnique.mockResolvedValue({ status: "ACTIVE", expiresAt: null });

    const result = await hasProductAccess("org_1", "COMPLY");

    expect(result).toBe(true);
  });

  it("returns true for a TRIAL row whose expiresAt is in the future", async () => {
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({ status: "TRIAL", expiresAt: inOneHour });

    const result = await hasProductAccess("org_1", "TRADE");

    expect(result).toBe(true);
  });

  it("returns false for a SUSPENDED row", async () => {
    mockFindUnique.mockResolvedValue({ status: "SUSPENDED", expiresAt: null });

    const result = await hasProductAccess("org_1", "COMPLY");

    expect(result).toBe(false);
  });

  it("returns false for an EXPIRED row", async () => {
    mockFindUnique.mockResolvedValue({ status: "EXPIRED", expiresAt: null });

    const result = await hasProductAccess("org_1", "TRADE");

    expect(result).toBe(false);
  });

  it("returns false for an ACTIVE row whose expiresAt is in the past", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({
      status: "ACTIVE",
      expiresAt: oneHourAgo,
    });

    const result = await hasProductAccess("org_1", "TRADE");

    expect(result).toBe(false);
  });
});

// ─── getActiveProducts ───────────────────────────────────────────────────

describe("getActiveProducts", () => {
  it("returns every ACTIVE + non-expired-TRIAL product for an org", async () => {
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    mockFindMany.mockResolvedValue([
      { product: "COMPLY", expiresAt: null },
      { product: "TRADE", expiresAt: inOneHour },
    ]);

    const result = await getActiveProducts("org_1");

    expect(result).toEqual(["COMPLY", "TRADE"]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        status: { in: ["ACTIVE", "TRIAL"] },
      },
      select: { product: true, expiresAt: true },
    });
  });

  it("filters out TRIAL rows whose expiresAt is already in the past", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    mockFindMany.mockResolvedValue([
      { product: "COMPLY", expiresAt: null },
      { product: "TRADE", expiresAt: oneHourAgo },
    ]);

    const result = await getActiveProducts("org_1");

    expect(result).toEqual(["COMPLY"]);
  });
});

// ─── grantProductAccess ──────────────────────────────────────────────────

describe("grantProductAccess", () => {
  it("re-activates a previously suspended row — clears suspendedAt/Reason", async () => {
    mockUpsert.mockResolvedValue({
      id: "opa_1",
      organizationId: "org_1",
      product: "TRADE",
      status: "ACTIVE",
    });

    await grantProductAccess({
      organizationId: "org_1",
      product: "TRADE",
      source: "MANUAL",
      grantedById: "user_1",
      notes: "enterprise sales grant",
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const call = mockUpsert.mock.calls[0][0];

    // Where clause uses the compound unique key
    expect(call.where).toEqual({
      organizationId_product: { organizationId: "org_1", product: "TRADE" },
    });

    // Update branch clears suspended fields so a previously SUSPENDED row
    // gets reactivated cleanly.
    expect(call.update).toMatchObject({
      status: "ACTIVE",
      suspendedAt: null,
      suspendedReason: null,
    });

    // Create branch carries the audit metadata through.
    expect(call.create).toMatchObject({
      organizationId: "org_1",
      product: "TRADE",
      status: "ACTIVE",
      source: "MANUAL",
      grantedById: "user_1",
      notes: "enterprise sales grant",
    });
  });

  it("writes INSTITUTIONAL source and seatCap into the upsert data", async () => {
    mockUpsert.mockResolvedValue({
      id: "opa_2",
      organizationId: "org1",
      product: "SCHOLAR",
      status: "ACTIVE",
    });

    await grantProductAccess({
      organizationId: "org1",
      product: "SCHOLAR",
      source: "INSTITUTIONAL",
      seatCap: 500,
      grantedById: "u1",
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create).toMatchObject({
      source: "INSTITUTIONAL",
      seatCap: 500,
    });
    expect(call.update).toMatchObject({ seatCap: 500 });
  });
});

// ─── revokeProductAccess ─────────────────────────────────────────────────

describe("revokeProductAccess", () => {
  it("is a no-op when no row exists for the (org, product) tuple — uses updateMany", async () => {
    // updateMany returns { count: 0 } when no rows match; the helper
    // must not throw or attempt a follow-up read.
    mockUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      revokeProductAccess("org_unknown", "TRADE", "test"),
    ).resolves.not.toThrow();

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { organizationId: "org_unknown", product: "TRADE" },
      data: {
        status: "SUSPENDED",
        suspendedAt: expect.any(Date),
        suspendedReason: "test",
      },
    });
  });
});
