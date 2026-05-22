/**
 * Tests for src/lib/trade/euc-reminder-service.ts — Sprint E5d.
 *
 * Coverage (8 cases):
 *   1. bucketForDaysRemaining: CRITICAL_7 for ≤7 days
 *   2. bucketForDaysRemaining: WARN_30 for 8-30 days
 *   3. bucketForDaysRemaining: INFO_90 for 31-90 days
 *   4. bucketForDaysRemaining: null beyond 90 days
 *   5. Phase 1: VALIDATED + validUntil < now → EXPIRED bulk update
 *   6. Reminder skips EUCs already notified within 24h (idempotency)
 *   7. CRITICAL bucket dispatches email; WARN/INFO do not
 *   8. Summary aggregates notification + email counts across EUCs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUpdateMany,
  mockFindMany,
  mockMemberFindMany,
  mockNotifFindFirst,
  mockNotifCreate,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockUpdateMany: vi.fn(),
  mockFindMany: vi.fn(),
  mockMemberFindMany: vi.fn(),
  mockNotifFindFirst: vi.fn(),
  mockNotifCreate: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeEUCRequest: {
      updateMany: mockUpdateMany,
      findMany: mockFindMany,
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
  runEucExpiryAndReminders,
  bucketForDaysRemaining,
} from "./euc-reminder-service";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
  mockMemberFindMany.mockResolvedValue([]);
  mockNotifFindFirst.mockResolvedValue(null);
  mockNotifCreate.mockResolvedValue({ id: "notif_new" });
  mockSendEmail.mockResolvedValue({ success: true });
});

const NOW = new Date("2026-06-01T00:00:00.000Z");

function eucDueIn(days: number, overrides: Record<string, unknown> = {}) {
  const validUntil = new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    id: `euc_${days}`,
    organizationId: "org_1",
    formType: "BAFA_C1",
    validUntil,
    partyId: "party_1",
    party: { id: "party_1", canonicalName: "Acme GmbH", countryCode: "DE" },
    ...overrides,
  };
}

describe("bucketForDaysRemaining", () => {
  it("CRITICAL_7 wins for 0..7 days", () => {
    expect(bucketForDaysRemaining(0)?.bucket).toBe("CRITICAL_7");
    expect(bucketForDaysRemaining(7)?.bucket).toBe("CRITICAL_7");
  });

  it("WARN_30 for 8..30 days", () => {
    expect(bucketForDaysRemaining(8)?.bucket).toBe("WARN_30");
    expect(bucketForDaysRemaining(30)?.bucket).toBe("WARN_30");
  });

  it("INFO_90 for 31..90 days", () => {
    expect(bucketForDaysRemaining(31)?.bucket).toBe("INFO_90");
    expect(bucketForDaysRemaining(90)?.bucket).toBe("INFO_90");
  });

  it("returns null beyond 90 days", () => {
    expect(bucketForDaysRemaining(91)).toBeNull();
    expect(bucketForDaysRemaining(500)).toBeNull();
  });
});

describe("runEucExpiryAndReminders — Phase 1 (expiry transitions)", () => {
  it("calls updateMany on VALIDATED + validUntil < now and reports count", async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 3 });
    const summary = await runEucExpiryAndReminders(NOW);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        status: "VALIDATED",
        validUntil: { lt: NOW },
      },
      data: { status: "EXPIRED" },
    });
    expect(summary.expired).toBe(3);
  });
});

describe("runEucExpiryAndReminders — Phase 2 (reminders)", () => {
  it("skips notification when an existing one was created in last 24h (idempotency)", async () => {
    mockFindMany.mockResolvedValueOnce([eucDueIn(5)]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_1",
        user: { email: "u1@example.com", name: "U One" },
      },
    ]);
    // Existing notification found → should skip
    mockNotifFindFirst.mockResolvedValueOnce({ id: "existing_notif" });

    const summary = await runEucExpiryAndReminders(NOW);

    expect(mockNotifCreate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(summary.emittedNotifications).toBe(0);
    expect(summary.emittedEmails).toBe(0);
  });

  it("CRITICAL bucket (≤7d) dispatches email; WARN bucket does NOT", async () => {
    // Two EUCs: one critical (5d), one warning (20d), same recipient
    mockFindMany.mockResolvedValueOnce([eucDueIn(5), eucDueIn(20)]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "u1@example.com", name: "U One" },
      },
    ]);
    // No prior notifications
    mockNotifFindFirst.mockResolvedValue(null);

    const summary = await runEucExpiryAndReminders(NOW);

    expect(summary.emittedNotifications).toBe(2);
    // Email only on the CRITICAL bucket — 1 send, not 2
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(summary.emittedEmails).toBe(1);

    const emailArgs = mockSendEmail.mock.calls[0];
    // 4th arg is the data payload — confirm severity CRITICAL
    expect(emailArgs?.[3]?.severity).toBe("CRITICAL");
  });

  it("aggregates totals across multiple EUCs + recipients", async () => {
    // 1 critical EUC, 2 recipients → 2 notifications + 2 emails
    mockFindMany.mockResolvedValueOnce([eucDueIn(3)]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "u1@example.com", name: "U One" },
      },
      {
        userId: "user_2",
        user: { email: "u2@example.com", name: "U Two" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValue(null);

    const summary = await runEucExpiryAndReminders(NOW);

    expect(summary.scanned).toBe(1);
    expect(summary.emittedNotifications).toBe(2);
    expect(summary.emittedEmails).toBe(2);
    expect(summary.perEuc).toHaveLength(1);
    expect(summary.perEuc[0]?.notificationsCreated).toBe(2);
    expect(summary.perEuc[0]?.emailsSent).toBe(2);
  });
});
