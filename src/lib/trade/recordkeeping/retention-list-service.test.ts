/**
 * Tests for retention-list-service.ts (Z32 Tier 4).
 *
 * Covers:
 *   1. Org-scoped query — every Prisma call filters on organizationId
 *   2. Excludes records past >90 day window when filter is applied
 *   3. Includes already-expired records when includeExpired = true
 *   4. Excludes already-expired records when includeExpired = false
 *   5. Groups records by record type with stable ordering
 *   6. getRetentionSummary aggregates totals across status buckets
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOpFindMany,
  mockLicFindMany,
  mockEucFindMany,
  mockReexFindMany,
  mockVsdFindMany,
  mockDraftFindMany,
} = vi.hoisted(() => ({
  mockOpFindMany: vi.fn(),
  mockLicFindMany: vi.fn(),
  mockEucFindMany: vi.fn(),
  mockReexFindMany: vi.fn(),
  mockVsdFindMany: vi.fn(),
  mockDraftFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: { findMany: mockOpFindMany },
    tradeLicense: { findMany: mockLicFindMany },
    tradeEUCRequest: { findMany: mockEucFindMany },
    tradeReexportConsent: { findMany: mockReexFindMany },
    tradeVoluntaryDisclosure: { findMany: mockVsdFindMany },
    tradeItemClassificationDraft: { findMany: mockDraftFindMany },
  },
}));

import {
  listExpiringRecords,
  getRetentionSummary,
} from "./retention-list-service";

const ORG = "org-acme-trade";
const NOW = new Date("2026-05-22T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockOpFindMany.mockResolvedValue([]);
  mockLicFindMany.mockResolvedValue([]);
  mockEucFindMany.mockResolvedValue([]);
  mockReexFindMany.mockResolvedValue([]);
  mockVsdFindMany.mockResolvedValue([]);
  mockDraftFindMany.mockResolvedValue([]);
});

describe("listExpiringRecords", () => {
  it("org-scopes every Prisma findMany call", async () => {
    await listExpiringRecords(ORG, { now: NOW });
    for (const mock of [
      mockOpFindMany,
      mockLicFindMany,
      mockEucFindMany,
      mockReexFindMany,
      mockVsdFindMany,
      mockDraftFindMany,
    ]) {
      expect(mock).toHaveBeenCalledTimes(1);
      const call = mock.mock.calls[0][0];
      expect(call.where.organizationId).toBe(ORG);
    }
  });

  it("includes records that are expiring-soon (within 90 days)", async () => {
    // Operation triggered 5 years - 30 days ago → 30 days remaining
    mockOpFindMany.mockResolvedValue([
      {
        id: "op-1",
        reference: "ISAR-2021-Q2-001",
        actualShipDate: new Date("2021-06-21T00:00:00.000Z"),
        scheduledShipDate: null,
        createdAt: new Date("2021-06-01T00:00:00.000Z"),
      },
    ]);
    const groups = await listExpiringRecords(ORG, { now: NOW });
    expect(groups).toHaveLength(1);
    expect(groups[0].recordType).toBe("OPERATION");
    expect(groups[0].records[0].label).toBe("ISAR-2021-Q2-001");
    expect(groups[0].records[0].retention.status).toBe("expiring-soon");
  });

  it("excludes records still in active status (>90 days remaining)", async () => {
    mockOpFindMany.mockResolvedValue([
      {
        id: "op-active",
        reference: "ISAR-2026-Q2-001",
        actualShipDate: new Date("2026-05-22T00:00:00.000Z"),
        scheduledShipDate: null,
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
      },
    ]);
    const groups = await listExpiringRecords(ORG, {
      now: NOW,
      withinDays: 90,
      includeExpired: false,
    });
    expect(groups).toHaveLength(0);
  });

  it("includes expired records when includeExpired=true", async () => {
    mockLicFindMany.mockResolvedValue([
      {
        id: "lic-old",
        licenseNumber: "BAFA-2019-001",
        licenseType: "EXPORT_LICENSE",
        validUntil: new Date("2020-01-01T00:00:00.000Z"),
        issuedAt: null,
        createdAt: new Date("2019-01-01T00:00:00.000Z"),
      },
    ]);
    const groups = await listExpiringRecords(ORG, {
      now: NOW,
      includeExpired: true,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].records[0].retention.status).toBe("expired");
  });

  it("excludes expired records when includeExpired=false", async () => {
    mockLicFindMany.mockResolvedValue([
      {
        id: "lic-old",
        licenseNumber: "BAFA-2019-001",
        licenseType: "EXPORT_LICENSE",
        validUntil: new Date("2020-01-01T00:00:00.000Z"),
        issuedAt: null,
        createdAt: new Date("2019-01-01T00:00:00.000Z"),
      },
    ]);
    const groups = await listExpiringRecords(ORG, {
      now: NOW,
      includeExpired: false,
    });
    expect(groups).toHaveLength(0);
  });

  it("groups records by type in stable presentation order", async () => {
    // Two record types both expiring-soon — assert OPERATION appears
    // before EUC in the result.
    mockOpFindMany.mockResolvedValue([
      {
        id: "op-1",
        reference: "OP-REF",
        actualShipDate: new Date("2021-06-21T00:00:00.000Z"),
        scheduledShipDate: null,
        createdAt: new Date("2021-06-01T00:00:00.000Z"),
      },
    ]);
    mockEucFindMany.mockResolvedValue([
      {
        id: "euc-1",
        formType: "BAFA_C1",
        validatedAt: new Date("2021-06-21T00:00:00.000Z"),
        receivedAt: null,
        sentAt: null,
        requestedAt: null,
      },
    ]);
    const groups = await listExpiringRecords(ORG, { now: NOW });
    expect(groups.map((g) => g.recordType)).toEqual(["OPERATION", "EUC"]);
  });

  it("falls back to scheduledShipDate when actualShipDate is null", async () => {
    mockOpFindMany.mockResolvedValue([
      {
        id: "op-scheduled",
        reference: "DRAFT-OP",
        actualShipDate: null,
        scheduledShipDate: new Date("2021-06-21T00:00:00.000Z"),
        createdAt: new Date("2021-06-01T00:00:00.000Z"),
      },
    ]);
    const groups = await listExpiringRecords(ORG, { now: NOW });
    expect(groups).toHaveLength(1);
    expect(groups[0].records[0].retention.status).toBe("expiring-soon");
    // trigger date should match the scheduledShipDate, not createdAt
    expect(groups[0].records[0].retention.triggerDate?.toISOString()).toBe(
      "2021-06-21T00:00:00.000Z",
    );
  });
});

describe("getRetentionSummary", () => {
  it("aggregates counts across status buckets", async () => {
    // Operation: expiring-soon (5y - 30d ago)
    mockOpFindMany.mockResolvedValue([
      {
        id: "op-soon",
        reference: "OP-SOON",
        actualShipDate: new Date("2021-06-21T00:00:00.000Z"),
        scheduledShipDate: null,
        createdAt: new Date("2021-06-01T00:00:00.000Z"),
      },
    ]);
    // License: expired (>5y ago)
    mockLicFindMany.mockResolvedValue([
      {
        id: "lic-expired",
        licenseNumber: "OLD-LIC",
        licenseType: "EXPORT_LICENSE",
        validUntil: new Date("2020-01-01T00:00:00.000Z"),
        issuedAt: null,
        createdAt: new Date("2019-01-01T00:00:00.000Z"),
      },
    ]);
    // EUC: active (just-now)
    mockEucFindMany.mockResolvedValue([
      {
        id: "euc-active",
        formType: "BAFA_C1",
        validatedAt: new Date("2026-05-22T00:00:00.000Z"),
        receivedAt: null,
        sentAt: null,
        requestedAt: null,
      },
    ]);

    const summary = await getRetentionSummary(ORG, NOW);
    expect(summary.totalExpiringSoon).toBe(1);
    expect(summary.totalExpired).toBe(1);
    expect(summary.totalActive).toBe(1);
    expect(summary.totalPending).toBe(0);
  });
});
