/**
 * Tests for src/lib/trade/sammelgenehmigung/sammelgenehmigung-service.ts
 * (Z11, Tier 5).
 *
 * Coverage (17+ cases):
 *   - listSammelgenehmigungen: org-scoped, status filter, ordering
 *   - getSammelgenehmigung: returns row or null
 *   - getAvailableCapacity: subtracts drawn, clamps to 0
 *   - findCoveringSammelgenehmigungen: ECCN + destination + end-user filters
 *   - findCoveringSammelgenehmigungen: filters out insufficient capacity
 *   - findCoveringSammelgenehmigungen: empty end-user list = wildcard
 *   - createSammelgenehmigung: writes DRAFT with connect
 *   - createSammelgenehmigung: validates validity window
 *   - createSammelgenehmigung: validates cap > 0
 *   - createSammelgenehmigung: rejects cross-org end-user partyId
 *   - activateSammelgenehmigung: DRAFT → ACTIVE
 *   - activateSammelgenehmigung: refuses non-DRAFT
 *   - activateSammelgenehmigung: refuses empty allowedECCNs
 *   - activateSammelgenehmigung: refuses missing bafaReference
 *   - recordDrawDown: increments + returns remaining
 *   - recordDrawDown: triggers EXHAUSTED on exact cap
 *   - recordDrawDown: refuses negative valueEur
 *   - recordDrawDown: refuses non-ACTIVE SAG
 *   - recordDrawDown: refuses draw exceeding cap
 *   - recordDrawDown: refuses cross-org operation
 *   - markExpiredByCron: bulk updateMany returns count
 *   - revokeSammelgenehmigung: ACTIVE → REVOKED
 *   - revokeSammelgenehmigung: refuses already-REVOKED
 *   - listExpiring: ACTIVE within window
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSagFindMany,
  mockSagFindFirst,
  mockSagCreate,
  mockSagUpdate,
  mockSagUpdateMany,
  mockDrawDownCreate,
  mockPartyFindMany,
  mockOperationFindFirst,
  mockTransaction,
} = vi.hoisted(() => ({
  mockSagFindMany: vi.fn(),
  mockSagFindFirst: vi.fn(),
  mockSagCreate: vi.fn(),
  mockSagUpdate: vi.fn(),
  mockSagUpdateMany: vi.fn(),
  mockDrawDownCreate: vi.fn(),
  mockPartyFindMany: vi.fn(),
  mockOperationFindFirst: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeSammelgenehmigung: {
      findMany: mockSagFindMany,
      findFirst: mockSagFindFirst,
      create: mockSagCreate,
      update: mockSagUpdate,
      updateMany: mockSagUpdateMany,
    },
    tradeSammelgenehmigungDrawDown: {
      create: mockDrawDownCreate,
    },
    tradeParty: { findMany: mockPartyFindMany },
    tradeOperation: { findFirst: mockOperationFindFirst },
    $transaction: mockTransaction,
  },
}));

import {
  listSammelgenehmigungen,
  getSammelgenehmigung,
  getAvailableCapacity,
  findCoveringSammelgenehmigungen,
  listExpiring,
  createSammelgenehmigung,
  activateSammelgenehmigung,
  recordDrawDown,
  markExpiredByCron,
  revokeSammelgenehmigung,
} from "./sammelgenehmigung-service";

const NOW = new Date("2026-05-23T12:00:00.000Z");
const VALID_FROM = new Date("2026-01-01T00:00:00.000Z");
const VALID_UNTIL = new Date("2027-12-31T23:59:59.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockSagFindMany.mockResolvedValue([]);
  mockSagFindFirst.mockResolvedValue(null);
  mockSagCreate.mockResolvedValue({ id: "sag_new" });
  mockSagUpdate.mockResolvedValue({ id: "sag_upd" });
  mockSagUpdateMany.mockResolvedValue({ count: 0 });
  mockDrawDownCreate.mockResolvedValue({ id: "dd_new" });
  mockPartyFindMany.mockResolvedValue([]);
  mockOperationFindFirst.mockResolvedValue(null);
  // Transaction passthrough — runs the callback with our mocks
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
    const tx = {
      tradeSammelgenehmigung: {
        findFirst: mockSagFindFirst,
        update: mockSagUpdate,
      },
      tradeSammelgenehmigungDrawDown: {
        create: mockDrawDownCreate,
      },
    };
    return fn(tx);
  });
});

function makeSag(overrides: Record<string, unknown> = {}) {
  return {
    id: "sag_1",
    organizationId: "org_1",
    bafaReference: "AGG-DE-2026-12345",
    title: "AeroJet Recurring Avionics 2026-2027",
    validFrom: VALID_FROM,
    validUntil: VALID_UNTIL,
    allowedECCNs: ["5A002.a"],
    allowedDestinations: ["US"],
    totalValueCapEur: 1_000_000,
    drawnDownValueEur: 200_000,
    status: "ACTIVE" as const,
    lastActionById: "user_1",
    grantDocumentId: null,
    notes: null,
    allowedEndUsers: [
      { id: "party_1", canonicalName: "AeroJet Inc.", countryCode: "US" },
    ],
    drawDowns: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ─── Reads ──────────────────────────────────────────────────────────

describe("listSammelgenehmigungen", () => {
  it("returns org-scoped rows with relations, ordered by validUntil asc", async () => {
    mockSagFindMany.mockResolvedValueOnce([makeSag()]);
    const result = await listSammelgenehmigungen("org_1");
    expect(result).toHaveLength(1);
    expect(mockSagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1" },
        orderBy: { validUntil: "asc" },
      }),
    );
  });

  it("applies status filter when provided", async () => {
    mockSagFindMany.mockResolvedValueOnce([]);
    await listSammelgenehmigungen("org_1", { status: "ACTIVE" });
    expect(mockSagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", status: "ACTIVE" },
      }),
    );
  });
});

describe("getSammelgenehmigung", () => {
  it("returns the row when org-scoped lookup succeeds", async () => {
    mockSagFindFirst.mockResolvedValueOnce(makeSag());
    const result = await getSammelgenehmigung("org_1", "sag_1");
    expect(result?.id).toBe("sag_1");
  });

  it("returns null when the row is not in this org", async () => {
    mockSagFindFirst.mockResolvedValueOnce(null);
    const result = await getSammelgenehmigung("org_1", "sag_other");
    expect(result).toBeNull();
  });
});

describe("getAvailableCapacity", () => {
  it("returns totalCap minus drawnDown", async () => {
    mockSagFindFirst.mockResolvedValueOnce({
      totalValueCapEur: 1_000_000,
      drawnDownValueEur: 200_000,
    });
    const cap = await getAvailableCapacity("org_1", "sag_1");
    expect(cap).toBe(800_000);
  });

  it("clamps to zero when drawn exceeds cap (shouldn't happen but defence in depth)", async () => {
    mockSagFindFirst.mockResolvedValueOnce({
      totalValueCapEur: 1_000_000,
      drawnDownValueEur: 1_100_000,
    });
    const cap = await getAvailableCapacity("org_1", "sag_1");
    expect(cap).toBe(0);
  });

  it("returns null when row not found", async () => {
    mockSagFindFirst.mockResolvedValueOnce(null);
    const cap = await getAvailableCapacity("org_1", "missing");
    expect(cap).toBeNull();
  });
});

describe("findCoveringSammelgenehmigungen", () => {
  it("filters by ECCN, destination, and end-user", async () => {
    mockSagFindMany.mockResolvedValueOnce([makeSag()]);
    const result = await findCoveringSammelgenehmigungen(
      "org_1",
      {
        eccn: "5A002.a",
        destinationCountry: "US",
        endUserId: "party_1",
        valueEur: 50_000,
      },
      NOW,
    );
    expect(result).toHaveLength(1);
    expect(mockSagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: "ACTIVE",
          allowedECCNs: { has: "5A002.a" },
          allowedDestinations: { has: "US" },
        }),
      }),
    );
  });

  it("excludes SAGs whose end-user list does not contain the criterion", async () => {
    mockSagFindMany.mockResolvedValueOnce([
      makeSag({
        allowedEndUsers: [
          { id: "party_other", canonicalName: "Other Co", countryCode: "DE" },
        ],
      }),
    ]);
    const result = await findCoveringSammelgenehmigungen(
      "org_1",
      {
        eccn: "5A002.a",
        destinationCountry: "US",
        endUserId: "party_1",
      },
      NOW,
    );
    expect(result).toHaveLength(0);
  });

  it("treats empty allowedEndUsers list as wildcard", async () => {
    mockSagFindMany.mockResolvedValueOnce([makeSag({ allowedEndUsers: [] })]);
    const result = await findCoveringSammelgenehmigungen(
      "org_1",
      {
        eccn: "5A002.a",
        destinationCountry: "US",
        endUserId: "party_1",
      },
      NOW,
    );
    expect(result).toHaveLength(1);
  });

  it("excludes SAGs without enough remaining capacity", async () => {
    mockSagFindMany.mockResolvedValueOnce([
      makeSag({
        totalValueCapEur: 1_000_000,
        drawnDownValueEur: 999_000,
      }),
    ]);
    const result = await findCoveringSammelgenehmigungen(
      "org_1",
      {
        eccn: "5A002.a",
        destinationCountry: "US",
        endUserId: "party_1",
        valueEur: 5_000,
      },
      NOW,
    );
    expect(result).toHaveLength(0);
  });
});

describe("listExpiring", () => {
  it("queries ACTIVE rows within the window", async () => {
    mockSagFindMany.mockResolvedValueOnce([]);
    await listExpiring("org_1", 30, NOW);
    expect(mockSagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: "ACTIVE",
        }),
      }),
    );
  });
});

// ─── Writes ─────────────────────────────────────────────────────────

describe("createSammelgenehmigung", () => {
  it("creates a DRAFT row with end-user connections", async () => {
    mockPartyFindMany.mockResolvedValueOnce([{ id: "party_1" }]);
    mockSagCreate.mockResolvedValueOnce({ id: "sag_new" });
    await createSammelgenehmigung({
      organizationId: "org_1",
      title: "Test SAG",
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
      allowedECCNs: ["5A002.a"],
      allowedDestinations: ["US"],
      allowedEndUserIds: ["party_1"],
      totalValueCapEur: 500_000,
      lastActionById: "user_1",
    });
    expect(mockSagCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DRAFT",
          organizationId: "org_1",
          allowedEndUsers: { connect: [{ id: "party_1" }] },
        }),
      }),
    );
  });

  it("refuses validity window where validUntil ≤ validFrom", async () => {
    await expect(
      createSammelgenehmigung({
        organizationId: "org_1",
        title: "Bad SAG",
        validFrom: VALID_UNTIL,
        validUntil: VALID_FROM,
        totalValueCapEur: 100,
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/validUntil must be strictly after validFrom/);
  });

  it("refuses cap of zero or negative", async () => {
    await expect(
      createSammelgenehmigung({
        organizationId: "org_1",
        title: "Bad SAG",
        validFrom: VALID_FROM,
        validUntil: VALID_UNTIL,
        totalValueCapEur: 0,
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/totalValueCapEur must be greater than zero/);
  });

  it("rejects cross-org end-user partyIds", async () => {
    mockPartyFindMany.mockResolvedValueOnce([]); // none belong to the org
    await expect(
      createSammelgenehmigung({
        organizationId: "org_1",
        title: "Bad SAG",
        validFrom: VALID_FROM,
        validUntil: VALID_UNTIL,
        allowedEndUserIds: ["party_other"],
        totalValueCapEur: 100,
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/do not belong to this organisation/);
  });
});

describe("activateSammelgenehmigung", () => {
  it("transitions DRAFT → ACTIVE", async () => {
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      status: "DRAFT",
      allowedECCNs: ["5A002.a"],
      allowedDestinations: ["US"],
    });
    await activateSammelgenehmigung({
      organizationId: "org_1",
      sammelgenehmigungId: "sag_1",
      bafaReference: "AGG-DE-2026-12345",
      lastActionById: "user_1",
    });
    expect(mockSagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
          bafaReference: "AGG-DE-2026-12345",
        }),
      }),
    );
  });

  it("refuses to activate from non-DRAFT", async () => {
    mockSagFindFirst.mockResolvedValueOnce(makeSag()); // ACTIVE
    await expect(
      activateSammelgenehmigung({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        bafaReference: "AGG-DE-2026-12345",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/status is ACTIVE, not DRAFT/);
  });

  it("refuses when allowedECCNs is empty", async () => {
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      status: "DRAFT",
      allowedECCNs: [],
    });
    await expect(
      activateSammelgenehmigung({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        bafaReference: "AGG-DE-2026-12345",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/allowedECCNs/);
  });

  it("refuses when bafaReference is missing or whitespace", async () => {
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      status: "DRAFT",
    });
    await expect(
      activateSammelgenehmigung({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        bafaReference: "   ",
        lastActionById: "user_1",
      }),
    ).rejects.toThrow(/bafaReference is required/);
  });
});

describe("recordDrawDown", () => {
  it("creates ledger row + increments running total", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      reference: "ISAR-2026-001",
    });
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      drawnDownValueEur: 0,
      totalValueCapEur: 1_000_000,
    });
    mockDrawDownCreate.mockResolvedValueOnce({ id: "dd_1" });
    const result = await recordDrawDown({
      organizationId: "org_1",
      sammelgenehmigungId: "sag_1",
      operationId: "op_1",
      valueEur: 50_000,
    });
    expect(result.remainingCapacityEur).toBe(950_000);
    expect(result.triggeredExhausted).toBe(false);
    expect(mockSagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ drawnDownValueEur: 50_000 }),
      }),
    );
  });

  it("flips status to EXHAUSTED when draw equals cap", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      reference: "ISAR-2026-001",
    });
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      drawnDownValueEur: 999_000,
      totalValueCapEur: 1_000_000,
    });
    const result = await recordDrawDown({
      organizationId: "org_1",
      sammelgenehmigungId: "sag_1",
      operationId: "op_1",
      valueEur: 1_000,
    });
    expect(result.remainingCapacityEur).toBe(0);
    expect(result.triggeredExhausted).toBe(true);
    expect(mockSagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "EXHAUSTED" }),
      }),
    );
  });

  it("refuses negative or zero valueEur", async () => {
    await expect(
      recordDrawDown({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        operationId: "op_1",
        valueEur: 0,
      }),
    ).rejects.toThrow(/greater than zero/);
    await expect(
      recordDrawDown({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        operationId: "op_1",
        valueEur: -100,
      }),
    ).rejects.toThrow(/greater than zero/);
  });

  it("refuses draw against a non-ACTIVE SAG", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      reference: "ISAR-2026-001",
    });
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      status: "EXPIRED",
    });
    await expect(
      recordDrawDown({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        operationId: "op_1",
        valueEur: 100,
      }),
    ).rejects.toThrow(/status is EXPIRED, not ACTIVE/);
  });

  it("refuses draw that would exceed the cap", async () => {
    mockOperationFindFirst.mockResolvedValueOnce({
      id: "op_1",
      reference: "ISAR-2026-001",
    });
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      drawnDownValueEur: 900_000,
      totalValueCapEur: 1_000_000,
    });
    await expect(
      recordDrawDown({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        operationId: "op_1",
        valueEur: 200_000, // would push to 1.1M
      }),
    ).rejects.toThrow(/would exceed cap/);
  });

  it("refuses draw when operation is not in the org", async () => {
    mockOperationFindFirst.mockResolvedValueOnce(null);
    await expect(
      recordDrawDown({
        organizationId: "org_1",
        sammelgenehmigungId: "sag_1",
        operationId: "op_cross_org",
        valueEur: 100,
      }),
    ).rejects.toThrow(/Operation not found/);
  });
});

describe("markExpiredByCron", () => {
  it("bulk-transitions ACTIVE rows past validUntil to EXPIRED", async () => {
    mockSagUpdateMany.mockResolvedValueOnce({ count: 4 });
    const count = await markExpiredByCron(NOW);
    expect(count).toBe(4);
    expect(mockSagUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          validUntil: { lt: NOW },
        }),
        data: { status: "EXPIRED" },
      }),
    );
  });
});

describe("revokeSammelgenehmigung", () => {
  it("transitions to REVOKED with appended note", async () => {
    mockSagFindFirst.mockResolvedValueOnce(makeSag());
    await revokeSammelgenehmigung("org_1", "sag_1", "user_1", "BAFA rescinded");
    expect(mockSagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REVOKED",
          notes: expect.stringContaining("[REVOKED] BAFA rescinded"),
        }),
      }),
    );
  });

  it("refuses already-REVOKED row", async () => {
    mockSagFindFirst.mockResolvedValueOnce({
      ...makeSag(),
      status: "REVOKED",
    });
    await expect(
      revokeSammelgenehmigung("org_1", "sag_1", "user_1", "again"),
    ).rejects.toThrow(/already REVOKED/);
  });

  it("refuses empty reason", async () => {
    mockSagFindFirst.mockResolvedValueOnce(makeSag());
    await expect(
      revokeSammelgenehmigung("org_1", "sag_1", "user_1", "   "),
    ).rejects.toThrow(/reason is required/);
  });
});
