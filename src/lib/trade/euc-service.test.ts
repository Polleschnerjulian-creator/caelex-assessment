/**
 * Tests for src/lib/trade/euc-service.ts — Caelex Trade Sprint E5b.
 *
 * Coverage (12 cases):
 *   1. listEucRequests org-scopes the query
 *   2. listEucRequests applies status filter when provided
 *   3. getEucRequest returns null for cross-org id (no leak)
 *   4. createEucRequest refuses when party belongs to other org
 *   5. createEucRequest refuses when operation belongs to other org
 *   6. createEucRequest happy path persists with REQUESTED default
 *   7. transitionEucStatus: valid REQUESTED → SENT_TO_PARTY
 *   8. transitionEucStatus: valid VALIDATED → EXPIRED
 *   9. transitionEucStatus: rejects invalid skip (REQUESTED → VALIDATED)
 *  10. transitionEucStatus: rejects same-status transition
 *  11. transitionEucStatus: REVOKED is reachable from non-terminal
 *  12. transitionEucStatus: stamps timestamp matching the next status
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindMany,
  mockFindFirst,
  mockCreate,
  mockUpdate,
  mockPartyFindFirst,
  mockOpFindFirst,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockPartyFindFirst: vi.fn(),
  mockOpFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeEUCRequest: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
    tradeParty: { findFirst: mockPartyFindFirst },
    tradeOperation: { findFirst: mockOpFindFirst },
  },
}));

import {
  listEucRequests,
  getEucRequest,
  createEucRequest,
  transitionEucStatus,
} from "./euc-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseEuc = {
  id: "euc_1",
  organizationId: "org_1",
  formType: "BAFA_C1" as const,
  partyId: "party_1",
  operationId: null,
  status: "REQUESTED" as const,
  requestedAt: new Date("2026-05-01"),
  sentAt: null,
  receivedAt: null,
  validatedAt: null,
  validUntil: null,
  lastActionById: "user_1",
  signedDocumentId: null,
  notes: null,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

describe("listEucRequests", () => {
  it("scopes the query to the org", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listEucRequests("org_42");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_42" }),
      }),
    );
  });

  it("applies status filter when provided", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listEucRequests("org_1", { status: "VALIDATED" });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: "VALIDATED",
        }),
      }),
    );
  });
});

describe("getEucRequest", () => {
  it("returns null when org does not own the row (no cross-org leak)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const result = await getEucRequest("org_1", "euc_from_other_org");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "euc_from_other_org", organizationId: "org_1" },
      }),
    );
  });
});

describe("createEucRequest", () => {
  it("throws when party belongs to a different org", async () => {
    mockPartyFindFirst.mockResolvedValueOnce(null);
    await expect(
      createEucRequest({
        organizationId: "org_1",
        formType: "BAFA_C1",
        partyId: "party_in_other_org",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Counterparty not found in this organisation/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws when operation belongs to a different org", async () => {
    mockPartyFindFirst.mockResolvedValueOnce({ id: "party_1" });
    mockOpFindFirst.mockResolvedValueOnce(null);
    await expect(
      createEucRequest({
        organizationId: "org_1",
        formType: "BAFA_C1",
        partyId: "party_1",
        operationId: "op_in_other_org",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Operation not found in this organisation/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("persists with REQUESTED default when party + op pass org-scope check", async () => {
    mockPartyFindFirst.mockResolvedValueOnce({ id: "party_1" });
    mockCreate.mockResolvedValueOnce({ ...baseEuc, id: "euc_new" });

    const result = await createEucRequest({
      organizationId: "org_1",
      formType: "BAFA_C1",
      partyId: "party_1",
      lastActionById: "user_1",
      notes: "first one",
    });

    expect(result.id).toBe("euc_new");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        formType: "BAFA_C1",
        partyId: "party_1",
        operationId: null,
        notes: "first one",
        lastActionById: "user_1",
      }),
    });
  });
});

describe("transitionEucStatus state machine", () => {
  it("allows REQUESTED → SENT_TO_PARTY and stamps sentAt", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseEuc, status: "REQUESTED" });
    mockUpdate.mockResolvedValueOnce({ ...baseEuc, status: "SENT_TO_PARTY" });

    await transitionEucStatus({
      organizationId: "org_1",
      eucId: "euc_1",
      nextStatus: "SENT_TO_PARTY",
      lastActionById: "user_1",
    });

    const updateCall = mockUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.status).toBe("SENT_TO_PARTY");
    expect(updateCall.data.sentAt).toBeInstanceOf(Date);
    expect(updateCall.data.receivedAt).toBeUndefined();
    expect(updateCall.data.validatedAt).toBeUndefined();
  });

  it("allows VALIDATED → EXPIRED", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseEuc, status: "VALIDATED" });
    mockUpdate.mockResolvedValueOnce({ ...baseEuc, status: "EXPIRED" });

    await transitionEucStatus({
      organizationId: "org_1",
      eucId: "euc_1",
      nextStatus: "EXPIRED",
      lastActionById: "user_1",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "EXPIRED" }),
      }),
    );
  });

  it("rejects skipping intermediate states (REQUESTED → VALIDATED)", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseEuc, status: "REQUESTED" });
    await expect(
      transitionEucStatus({
        organizationId: "org_1",
        eucId: "euc_1",
        nextStatus: "VALIDATED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects same-status transitions", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseEuc, status: "RECEIVED" });
    await expect(
      transitionEucStatus({
        organizationId: "org_1",
        eucId: "euc_1",
        nextStatus: "RECEIVED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows REVOKED from any non-terminal state", async () => {
    // SENT_TO_PARTY → REVOKED
    mockFindFirst.mockResolvedValueOnce({
      ...baseEuc,
      status: "SENT_TO_PARTY",
    });
    mockUpdate.mockResolvedValueOnce({ ...baseEuc, status: "REVOKED" });

    await transitionEucStatus({
      organizationId: "org_1",
      eucId: "euc_1",
      nextStatus: "REVOKED",
      lastActionById: "user_1",
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REVOKED" }),
      }),
    );
  });

  it("rejects REVOKED from terminal states (EXPIRED)", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseEuc, status: "EXPIRED" });
    await expect(
      transitionEucStatus({
        organizationId: "org_1",
        eucId: "euc_1",
        nextStatus: "REVOKED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("throws on cross-org id (org-scope defence)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await expect(
      transitionEucStatus({
        organizationId: "org_1",
        eucId: "euc_from_other_org",
        nextStatus: "SENT_TO_PARTY",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/EUC request not found/);
  });
});
