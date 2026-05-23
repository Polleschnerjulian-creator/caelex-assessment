/**
 * Tests for sammelgenehmigung-reminder-service.ts (Z11b, Tier 5).
 *
 * Coverage (9 cases):
 *   1. bucketForDaysRemaining: CRITICAL_0 wins at 0 and negative
 *   2. bucketForDaysRemaining: WARN_3 for 1..3
 *   3. bucketForDaysRemaining: INFO_14 for 4..14
 *   4. bucketForDaysRemaining: INFO_30 for 15..30
 *   5. bucketForDaysRemaining: null beyond 30
 *   6. Phase 1: ACTIVE past validUntil → EXPIRED bulk update
 *   7. Reminder skips SAGs already notified within 24h (idempotency)
 *   8. CRITICAL bucket dispatches email; WARN/INFO do not
 *   9. Summary aggregates counts across SAGs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSagUpdateMany,
  mockSagFindMany,
  mockMemberFindMany,
  mockNotifFindFirst,
  mockNotifCreate,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockSagUpdateMany: vi.fn(),
  mockSagFindMany: vi.fn(),
  mockMemberFindMany: vi.fn(),
  mockNotifFindFirst: vi.fn(),
  mockNotifCreate: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeSammelgenehmigung: {
      updateMany: mockSagUpdateMany,
      findMany: mockSagFindMany,
    },
    organizationMember: { findMany: mockMemberFindMany },
    notification: {
      findFirst: mockNotifFindFirst,
      create: mockNotifCreate,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendTradeLicenseExpiry: mockSendEmail,
}));

import {
  runSammelgenehmigungRemindersAndExpiry,
  bucketForDaysRemaining,
} from "./sammelgenehmigung-reminder-service";

const NOW = new Date("2026-05-23T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockSagUpdateMany.mockResolvedValue({ count: 0 });
  mockSagFindMany.mockResolvedValue([]);
  mockMemberFindMany.mockResolvedValue([]);
  mockNotifFindFirst.mockResolvedValue(null);
  mockNotifCreate.mockResolvedValue({ id: "notif_new" });
  mockSendEmail.mockResolvedValue({ success: true });
});

function sagExpiringIn(days: number, overrides: Record<string, unknown> = {}) {
  const validUntil = new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    id: `sag_${days}`,
    organizationId: "org_1",
    title: "AeroJet Recurring Avionics 2026-2027",
    bafaReference: "AGG-DE-2026-12345",
    validUntil,
    ...overrides,
  };
}

describe("bucketForDaysRemaining", () => {
  it("CRITICAL_0 wins at 0 and negative days", () => {
    expect(bucketForDaysRemaining(0)?.bucket).toBe("CRITICAL_0");
    expect(bucketForDaysRemaining(-1)?.bucket).toBe("CRITICAL_0");
    expect(bucketForDaysRemaining(-30)?.bucket).toBe("CRITICAL_0");
  });

  it("WARN_3 for 1..3 days", () => {
    expect(bucketForDaysRemaining(1)?.bucket).toBe("WARN_3");
    expect(bucketForDaysRemaining(3)?.bucket).toBe("WARN_3");
  });

  it("INFO_14 for 4..14 days", () => {
    expect(bucketForDaysRemaining(4)?.bucket).toBe("INFO_14");
    expect(bucketForDaysRemaining(14)?.bucket).toBe("INFO_14");
  });

  it("INFO_30 for 15..30 days", () => {
    expect(bucketForDaysRemaining(15)?.bucket).toBe("INFO_30");
    expect(bucketForDaysRemaining(30)?.bucket).toBe("INFO_30");
  });

  it("returns null beyond 30 days out", () => {
    expect(bucketForDaysRemaining(31)).toBeNull();
    expect(bucketForDaysRemaining(365)).toBeNull();
  });
});

describe("runSammelgenehmigungRemindersAndExpiry", () => {
  it("transitions ACTIVE past validUntil → EXPIRED in Phase 1", async () => {
    mockSagUpdateMany.mockResolvedValueOnce({ count: 3 });
    const summary = await runSammelgenehmigungRemindersAndExpiry(NOW);
    expect(mockSagUpdateMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        validUntil: { lt: NOW },
      },
      data: { status: "EXPIRED" },
    });
    expect(summary.expiredTransitions).toBe(3);
  });

  it("skips SAGs that already have a notification within 24h", async () => {
    mockSagFindMany.mockResolvedValueOnce([sagExpiringIn(10)]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_1",
        user: { email: "u1@x.test", name: "U1" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValueOnce({ id: "existing_notif" });
    const summary = await runSammelgenehmigungRemindersAndExpiry(NOW);
    expect(mockNotifCreate).not.toHaveBeenCalled();
    expect(summary.emittedNotifications).toBe(0);
  });

  it("CRITICAL bucket dispatches email; WARN does not", async () => {
    mockSagFindMany.mockResolvedValueOnce([
      sagExpiringIn(0, { id: "sag_crit" }), // CRITICAL_0
      sagExpiringIn(2, { id: "sag_warn" }), // WARN_3
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "u1@x.test", name: "U1" },
      },
    ]);
    const summary = await runSammelgenehmigungRemindersAndExpiry(NOW);
    expect(summary.emittedNotifications).toBe(2);
    expect(summary.emittedEmails).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("aggregates per-SAG results in the summary", async () => {
    mockSagFindMany.mockResolvedValueOnce([
      sagExpiringIn(10),
      sagExpiringIn(2, { id: "sag_warn" }),
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "u1@x.test", name: "U1" },
      },
      {
        userId: "user_2",
        user: { email: "u2@x.test", name: "U2" },
      },
    ]);
    const summary = await runSammelgenehmigungRemindersAndExpiry(NOW);
    expect(summary.scanned).toBe(2);
    expect(summary.perSammelgenehmigung).toHaveLength(2);
    expect(summary.perSammelgenehmigung.every((r) => r.ok)).toBe(true);
    // 2 SAGs × 2 recipients × no existing notif = 4 notifications
    expect(summary.emittedNotifications).toBe(4);
  });

  it("handles SAGs with no recipients gracefully (zero notifications)", async () => {
    mockSagFindMany.mockResolvedValueOnce([sagExpiringIn(10)]);
    mockMemberFindMany.mockResolvedValueOnce([]); // no MANAGER+ members
    const summary = await runSammelgenehmigungRemindersAndExpiry(NOW);
    expect(summary.emittedNotifications).toBe(0);
    expect(summary.perSammelgenehmigung[0].ok).toBe(true);
  });

  it("uses placeholder when bafaReference is null in title", async () => {
    mockSagFindMany.mockResolvedValueOnce([
      sagExpiringIn(2, { bafaReference: null }),
    ]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_1",
        user: { email: "u1@x.test", name: "U1" },
      },
    ]);
    await runSammelgenehmigungRemindersAndExpiry(NOW);
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: expect.stringContaining("no BAFA reference yet"),
        }),
      }),
    );
  });
});
