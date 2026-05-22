/**
 * Tests for src/lib/trade/vsd-service.ts — Sprint E1c.
 *
 * Coverage (17 cases):
 *   1. listVsds org-scopes the query
 *   2. listVsds applies status + authority filters
 *   3. getVsd returns null for cross-org id (no leak)
 *   4. createVsd refuses cross-org operation
 *   5. createVsd refuses cross-org item
 *   6. createVsd refuses cross-org party
 *   7. createVsd happy path with DISCOVERED default
 *   8. State machine: DISCOVERED → INVESTIGATING stamps investigatingAt
 *   9. State machine: INVESTIGATING → DRAFTED stamps draftedAt
 *  10. State machine: DRAFTED → SUBMITTED throws without filingReference
 *  11. State machine: DRAFTED → SUBMITTED stamps submittedAt + filingRef
 *  12. State machine: ACKNOWLEDGED → RESOLVED throws without outcome
 *  13. State machine: ACKNOWLEDGED → RESOLVED stamps outcome + penalty
 *  14. State machine: DISCOVERED → DRAFTED rejected (no skipping)
 *  15. State machine: SUBMITTED → DISCOVERED rejected (no backward)
 *  16. State machine: WITHDRAWN reachable from non-terminal
 *  17. State machine: WITHDRAWN sets outcome=WITHDRAWN + resolvedAt
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindMany,
  mockFindFirst,
  mockCreate,
  mockUpdate,
  mockOpFindFirst,
  mockItemFindFirst,
  mockPartyFindFirst,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockOpFindFirst: vi.fn(),
  mockItemFindFirst: vi.fn(),
  mockPartyFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeVoluntaryDisclosure: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
    },
    tradeOperation: { findFirst: mockOpFindFirst },
    tradeItem: { findFirst: mockItemFindFirst },
    tradeParty: { findFirst: mockPartyFindFirst },
  },
}));

import {
  listVsds,
  getVsd,
  createVsd,
  transitionVsdStatus,
} from "./vsd-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseVsd = {
  id: "vsd_1",
  organizationId: "org_1",
  authority: "BIS" as const,
  violationType: "UNLICENSED_EXPORT" as const,
  title: "Test disclosure",
  description: "Shipped without license",
  discoveredAt: new Date("2026-05-01"),
  occurredAt: null,
  operationId: null,
  itemId: null,
  partyId: null,
  status: "DISCOVERED" as const,
  investigatingAt: null,
  draftedAt: null,
  submittedAt: null,
  filingReference: null,
  acknowledgedAt: null,
  resolvedAt: null,
  outcome: null,
  penaltyAmountUsd: null,
  outcomeNotes: null,
  lastActionById: "user_1",
  filingDocumentId: null,
  notes: null,
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date("2026-05-01"),
};

describe("listVsds", () => {
  it("scopes the query to the org", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listVsds("org_42");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_42" }),
      }),
    );
  });

  it("applies status + authority filters", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await listVsds("org_1", { status: "SUBMITTED", authority: "BIS" });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: "SUBMITTED",
          authority: "BIS",
        }),
      }),
    );
  });
});

describe("getVsd", () => {
  it("returns null for cross-org id (no leak)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const result = await getVsd("org_1", "vsd_other_org");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vsd_other_org", organizationId: "org_1" },
      }),
    );
  });
});

describe("createVsd", () => {
  it("refuses cross-org operation", async () => {
    mockOpFindFirst.mockResolvedValueOnce(null);
    await expect(
      createVsd({
        organizationId: "org_1",
        authority: "BIS",
        violationType: "UNLICENSED_EXPORT",
        title: "Test",
        description: "Desc",
        discoveredAt: new Date("2026-05-01"),
        operationId: "op_other_org",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Operation not found/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("refuses cross-org item", async () => {
    mockItemFindFirst.mockResolvedValueOnce(null);
    await expect(
      createVsd({
        organizationId: "org_1",
        authority: "BIS",
        violationType: "MISCLASSIFICATION",
        title: "Test",
        description: "Desc",
        discoveredAt: new Date("2026-05-01"),
        itemId: "item_other_org",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Item not found/);
  });

  it("refuses cross-org party", async () => {
    mockPartyFindFirst.mockResolvedValueOnce(null);
    await expect(
      createVsd({
        organizationId: "org_1",
        authority: "OFAC",
        violationType: "PROHIBITED_PARTY",
        title: "Test",
        description: "Desc",
        discoveredAt: new Date("2026-05-01"),
        partyId: "party_other_org",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Party not found/);
  });

  it("happy path persists with DISCOVERED default", async () => {
    mockCreate.mockResolvedValueOnce({ ...baseVsd, id: "vsd_new" });

    const result = await createVsd({
      organizationId: "org_1",
      authority: "BIS",
      violationType: "UNLICENSED_EXPORT",
      title: "Shipped 5A002.a to RU without license",
      description: "Single shipment in Aug 2025",
      discoveredAt: new Date("2026-05-01"),
      lastActionById: "user_1",
    });

    expect(result.id).toBe("vsd_new");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        authority: "BIS",
        violationType: "UNLICENSED_EXPORT",
        title: "Shipped 5A002.a to RU without license",
        operationId: null,
        itemId: null,
        partyId: null,
      }),
    });
  });
});

describe("transitionVsdStatus state machine", () => {
  it("DISCOVERED → INVESTIGATING stamps investigatingAt", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseVsd, status: "DISCOVERED" });
    mockUpdate.mockResolvedValueOnce({ ...baseVsd, status: "INVESTIGATING" });

    await transitionVsdStatus({
      organizationId: "org_1",
      vsdId: "vsd_1",
      nextStatus: "INVESTIGATING",
      lastActionById: "user_1",
    });

    const data = mockUpdate.mock.calls[0]?.[0]?.data;
    expect(data.status).toBe("INVESTIGATING");
    expect(data.investigatingAt).toBeInstanceOf(Date);
  });

  it("INVESTIGATING → DRAFTED stamps draftedAt", async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseVsd,
      status: "INVESTIGATING",
    });
    mockUpdate.mockResolvedValueOnce({ ...baseVsd, status: "DRAFTED" });

    await transitionVsdStatus({
      organizationId: "org_1",
      vsdId: "vsd_1",
      nextStatus: "DRAFTED",
      lastActionById: "user_1",
    });

    const data = mockUpdate.mock.calls[0]?.[0]?.data;
    expect(data.draftedAt).toBeInstanceOf(Date);
  });

  it("DRAFTED → SUBMITTED throws without filingReference", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseVsd, status: "DRAFTED" });
    await expect(
      transitionVsdStatus({
        organizationId: "org_1",
        vsdId: "vsd_1",
        nextStatus: "SUBMITTED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/SUBMITTED transition requires a filing reference/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("DRAFTED → SUBMITTED stamps submittedAt + filingReference", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseVsd, status: "DRAFTED" });
    mockUpdate.mockResolvedValueOnce({ ...baseVsd, status: "SUBMITTED" });

    await transitionVsdStatus({
      organizationId: "org_1",
      vsdId: "vsd_1",
      nextStatus: "SUBMITTED",
      filingReference: "BIS-VSD-2026-001",
      lastActionById: "user_1",
    });

    const data = mockUpdate.mock.calls[0]?.[0]?.data;
    expect(data.submittedAt).toBeInstanceOf(Date);
    expect(data.filingReference).toBe("BIS-VSD-2026-001");
  });

  it("ACKNOWLEDGED → RESOLVED throws without outcome", async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseVsd,
      status: "ACKNOWLEDGED",
    });
    await expect(
      transitionVsdStatus({
        organizationId: "org_1",
        vsdId: "vsd_1",
        nextStatus: "RESOLVED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/RESOLVED transition requires an outcome/);
  });

  it("ACKNOWLEDGED → RESOLVED stamps outcome + penalty + resolvedAt", async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseVsd,
      status: "ACKNOWLEDGED",
    });
    mockUpdate.mockResolvedValueOnce({ ...baseVsd, status: "RESOLVED" });

    await transitionVsdStatus({
      organizationId: "org_1",
      vsdId: "vsd_1",
      nextStatus: "RESOLVED",
      outcome: "CIVIL_PENALTY",
      penaltyAmountUsd: 50000,
      outcomeNotes: "Settled with full payment",
      lastActionById: "user_1",
    });

    const data = mockUpdate.mock.calls[0]?.[0]?.data;
    expect(data.outcome).toBe("CIVIL_PENALTY");
    expect(data.penaltyAmountUsd).toBe(50000);
    expect(data.outcomeNotes).toBe("Settled with full payment");
    expect(data.resolvedAt).toBeInstanceOf(Date);
  });

  it("DISCOVERED → DRAFTED rejected (no skipping)", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseVsd, status: "DISCOVERED" });
    await expect(
      transitionVsdStatus({
        organizationId: "org_1",
        vsdId: "vsd_1",
        nextStatus: "DRAFTED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("SUBMITTED → DISCOVERED rejected (no backward)", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseVsd, status: "SUBMITTED" });
    await expect(
      transitionVsdStatus({
        organizationId: "org_1",
        vsdId: "vsd_1",
        nextStatus: "DISCOVERED",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("WITHDRAWN reachable from non-terminal INVESTIGATING", async () => {
    mockFindFirst.mockResolvedValueOnce({
      ...baseVsd,
      status: "INVESTIGATING",
    });
    mockUpdate.mockResolvedValueOnce({ ...baseVsd, status: "WITHDRAWN" });

    await transitionVsdStatus({
      organizationId: "org_1",
      vsdId: "vsd_1",
      nextStatus: "WITHDRAWN",
      lastActionById: "user_1",
    });

    const data = mockUpdate.mock.calls[0]?.[0]?.data;
    expect(data.status).toBe("WITHDRAWN");
    // WITHDRAWN should set outcome=WITHDRAWN + resolvedAt
    expect(data.outcome).toBe("WITHDRAWN");
    expect(data.resolvedAt).toBeInstanceOf(Date);
  });

  it("WITHDRAWN blocked from terminal RESOLVED", async () => {
    mockFindFirst.mockResolvedValueOnce({ ...baseVsd, status: "RESOLVED" });
    await expect(
      transitionVsdStatus({
        organizationId: "org_1",
        vsdId: "vsd_1",
        nextStatus: "WITHDRAWN",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/Invalid lifecycle transition/);
  });

  it("throws on cross-org id (org-scope defence)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await expect(
      transitionVsdStatus({
        organizationId: "org_1",
        vsdId: "vsd_other_org",
        nextStatus: "INVESTIGATING",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/VSD not found/);
  });
});
