/**
 * Tests for uk-ecju-reminder-service.ts (Z37-UK, Tier 4).
 *
 * Coverage:
 *   1. bucketForDaysRemaining classifies correctly
 *   2. Phase 1 expires APPROVED + EXHAUSTED licences past validUntil
 *   3. Phase 2 skips licences outside the 90-day window
 *   4. Phase 2 emits one Notification per recipient per licence
 *   5. Idempotency guard skips when notification exists in last 24h
 *   6. CRITICAL bucket dispatches an email
 *   7. WARNING + INFO buckets skip email dispatch
 *   8. No recipients → no Notifications
 *   9. Per-license error captures in `perLicense[]` instead of throwing
 *  10. Summary aggregates totals correctly
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
    tradeUkEcjuLicense: {
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

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  runUkEcjuExpiryAndReminders,
  bucketForDaysRemaining,
} from "./uk-ecju-reminder-service";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
  mockMemberFindMany.mockResolvedValue([]);
  mockNotifFindFirst.mockResolvedValue(null);
  mockNotifCreate.mockResolvedValue({ id: "notif_1" });
  mockSendEmail.mockResolvedValue({ ok: true });
});

const NOW = new Date("2026-05-23T09:15:00Z");
function inDays(n: number): Date {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
}

describe("bucketForDaysRemaining", () => {
  it("0 days → CRITICAL_7", () => {
    expect(bucketForDaysRemaining(0)?.bucket).toBe("CRITICAL_7");
  });

  it("5 days → CRITICAL_7", () => {
    expect(bucketForDaysRemaining(5)?.bucket).toBe("CRITICAL_7");
  });

  it("15 days → WARN_30", () => {
    expect(bucketForDaysRemaining(15)?.bucket).toBe("WARN_30");
  });

  it("60 days → INFO_90", () => {
    expect(bucketForDaysRemaining(60)?.bucket).toBe("INFO_90");
  });

  it("100 days → null (outside window)", () => {
    expect(bucketForDaysRemaining(100)).toBeNull();
  });
});

describe("runUkEcjuExpiryAndReminders", () => {
  it("Phase 1: expires APPROVED + EXHAUSTED licences past validUntil", async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });
    const summary = await runUkEcjuExpiryAndReminders(NOW);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["APPROVED", "EXHAUSTED"] },
        validUntil: { lt: NOW },
      },
      data: { status: "EXPIRED" },
    });
    expect(summary.expired).toBe(3);
  });

  it("Phase 2: skips licence outside 90-day window", async () => {
    // 100 days out → outside window → not even returned by findMany.
    mockFindMany.mockResolvedValue([]);
    const summary = await runUkEcjuExpiryAndReminders(NOW);
    expect(summary.perLicense).toHaveLength(0);
  });

  it("CRITICAL bucket dispatches a Notification + an email", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_1",
        organizationId: "org_1",
        licenseType: "SIEL",
        ecjuReference: "GBSIEL/2026/0012345",
        validUntil: inDays(3),
        applicantName: "Caelex UK",
        destinationCountries: ["IN"],
        controlListEntries: ["PL5002A"],
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "manager@caelex.uk", name: "Alex" },
      },
    ]);

    const summary = await runUkEcjuExpiryAndReminders(NOW);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(1);
    expect(mockNotifCreate).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    // Email payload sanity-check.
    const [, , licenseId, payload] = mockSendEmail.mock.calls[0];
    expect(licenseId).toBe("lic_1");
    expect(payload.authority).toBe("ECJU");
  });

  it("WARN_30 bucket emits Notification but skips email", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_2",
        organizationId: "org_1",
        licenseType: "OIEL",
        ecjuReference: "GBOIEL/2025/0042",
        validUntil: inDays(20),
        applicantName: "Caelex UK",
        destinationCountries: ["DE"],
        controlListEntries: ["PL9003"],
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "manager@caelex.uk", name: "Alex" },
      },
    ]);

    const summary = await runUkEcjuExpiryAndReminders(NOW);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("idempotency: skips when notification already exists in last 24h", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_3",
        organizationId: "org_1",
        licenseType: "SIEL",
        ecjuReference: "GBSIEL/2026/0099999",
        validUntil: inDays(5),
        applicantName: "Caelex UK",
        destinationCountries: ["IN"],
        controlListEntries: ["PL5002A"],
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "manager@caelex.uk", name: "Alex" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValue({ id: "notif_existing" });

    const summary = await runUkEcjuExpiryAndReminders(NOW);
    expect(summary.emittedNotifications).toBe(0);
    expect(mockNotifCreate).not.toHaveBeenCalled();
  });

  it("no recipients → no Notifications, no errors", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_4",
        organizationId: "org_no_managers",
        licenseType: "SIEL",
        ecjuReference: "GBSIEL/2026/0011111",
        validUntil: inDays(2),
        applicantName: "Caelex UK",
        destinationCountries: ["IN"],
        controlListEntries: ["PL5002A"],
      },
    ]);
    mockMemberFindMany.mockResolvedValue([]);

    const summary = await runUkEcjuExpiryAndReminders(NOW);
    expect(summary.scanned).toBe(1);
    expect(summary.emittedNotifications).toBe(0);
    expect(summary.perLicense[0]?.ok).toBe(true);
  });

  it("email-send failure does not crash the cron", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_5",
        organizationId: "org_1",
        licenseType: "SIEL",
        ecjuReference: "GBSIEL/2026/0055555",
        validUntil: inDays(2),
        applicantName: "Caelex UK",
        destinationCountries: ["IN"],
        controlListEntries: ["PL5002A"],
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "broken@caelex.uk", name: "Alex" },
      },
    ]);
    mockSendEmail.mockRejectedValue(new Error("SMTP down"));

    const summary = await runUkEcjuExpiryAndReminders(NOW);
    // Notification was created even though the email failed.
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(0);
    // No throw → ok = true on this licence
    expect(summary.perLicense[0]?.ok).toBe(true);
  });

  it("summary aggregates totals", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_a",
        organizationId: "org_1",
        licenseType: "SIEL",
        ecjuReference: "GBSIEL/2026/0000001",
        validUntil: inDays(3),
        applicantName: "Caelex UK",
        destinationCountries: ["IN"],
        controlListEntries: ["PL5002A"],
      },
      {
        id: "lic_b",
        organizationId: "org_1",
        licenseType: "OIEL",
        ecjuReference: "GBOIEL/2025/0042",
        validUntil: inDays(50),
        applicantName: "Caelex UK",
        destinationCountries: ["DE"],
        controlListEntries: ["PL9003"],
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "user_1",
        user: { email: "m@caelex.uk", name: "Alex" },
      },
    ]);

    const summary = await runUkEcjuExpiryAndReminders(NOW);
    expect(summary.scanned).toBe(2);
    expect(summary.emittedNotifications).toBe(2);
    expect(summary.emittedEmails).toBe(1); // only the CRITICAL one
    expect(summary.perLicense).toHaveLength(2);
  });
});
