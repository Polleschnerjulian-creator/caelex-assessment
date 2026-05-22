/**
 * Tests for src/lib/trade/reexport-reminder-service.ts — Sprint E4c.
 *
 * Coverage (6 cases):
 *   1. bucketForDaysRemaining boundaries (mirrors EUC)
 *   2. Phase 1 updateMany targets APPROVED (NOT VALIDATED) — key
 *      difference from EUC where the absorbing source is VALIDATED
 *   3. 24h idempotency guard skips when notification exists
 *   4. CRITICAL bucket dispatches email; WARN does not
 *   5. Email payload includes the geographic flow (requestingParty
 *      → newDestinationCountry) in coversItems
 *   6. Summary aggregates totals across recipients
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
    tradeReexportConsent: {
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
  runReexportExpiryAndReminders,
  bucketForDaysRemaining,
} from "./reexport-reminder-service";

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

function consentDueIn(days: number, overrides: Record<string, unknown> = {}) {
  const validUntil = new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    id: `rx_${days}`,
    organizationId: "org_1",
    formType: "BAFA_REEXPORT_AUTH",
    validUntil,
    requestingPartyId: "party_1",
    newDestinationCountry: "IN",
    requestingParty: {
      id: "party_1",
      canonicalName: "Acme GmbH",
      countryCode: "DE",
    },
    ...overrides,
  };
}

describe("bucketForDaysRemaining", () => {
  it("CRITICAL_7 wins for 0..7 days", () => {
    expect(bucketForDaysRemaining(0)?.bucket).toBe("CRITICAL_7");
    expect(bucketForDaysRemaining(7)?.bucket).toBe("CRITICAL_7");
  });

  it("WARN_30 for 8..30", () => {
    expect(bucketForDaysRemaining(8)?.bucket).toBe("WARN_30");
  });

  it("INFO_90 for 31..90", () => {
    expect(bucketForDaysRemaining(90)?.bucket).toBe("INFO_90");
  });

  it("null beyond 90", () => {
    expect(bucketForDaysRemaining(91)).toBeNull();
  });
});

describe("Phase 1 expiry", () => {
  it("updateMany targets APPROVED (not VALIDATED) + validUntil<now", async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 4 });
    const summary = await runReexportExpiryAndReminders(NOW);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        status: "APPROVED",
        validUntil: { lt: NOW },
      },
      data: { status: "EXPIRED" },
    });
    expect(summary.expired).toBe(4);
  });
});

describe("Phase 2 reminders", () => {
  it("24h idempotency guard skips when notification exists", async () => {
    mockFindMany.mockResolvedValueOnce([consentDueIn(5)]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_1",
        user: { email: "u1@example.com", name: "U One" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValueOnce({ id: "existing" });

    const summary = await runReexportExpiryAndReminders(NOW);

    expect(mockNotifCreate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(summary.emittedNotifications).toBe(0);
    expect(summary.emittedEmails).toBe(0);
  });

  it("CRITICAL bucket dispatches email, WARN does not", async () => {
    mockFindMany.mockResolvedValueOnce([
      consentDueIn(5), // CRITICAL
      consentDueIn(20), // WARN
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "u1@example.com", name: "U One" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValue(null);

    const summary = await runReexportExpiryAndReminders(NOW);

    expect(summary.emittedNotifications).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(summary.emittedEmails).toBe(1);

    // Confirm severity CRITICAL on the dispatched email
    const emailArgs = mockSendEmail.mock.calls[0];
    expect(emailArgs?.[3]?.severity).toBe("CRITICAL");
  });

  it("email payload includes party→destination flow in coversItems", async () => {
    mockFindMany.mockResolvedValueOnce([consentDueIn(3)]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "u1@example.com", name: "U One" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValue(null);

    await runReexportExpiryAndReminders(NOW);

    const emailArgs = mockSendEmail.mock.calls[0];
    expect(emailArgs?.[3]?.coversItems).toContain("Acme GmbH → IN");
  });

  it("aggregates totals across multiple recipients", async () => {
    mockFindMany.mockResolvedValueOnce([consentDueIn(3)]);
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

    const summary = await runReexportExpiryAndReminders(NOW);

    expect(summary.scanned).toBe(1);
    expect(summary.emittedNotifications).toBe(2);
    expect(summary.emittedEmails).toBe(2);
    expect(summary.perConsent[0]?.notificationsCreated).toBe(2);
  });
});
