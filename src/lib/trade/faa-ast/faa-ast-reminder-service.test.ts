/**
 * Tests for faa-ast-reminder-service.ts (Z38-US, Tier 4).
 *
 * Coverage:
 *   1. bucketForDaysRemaining classifies correctly
 *   2. Phase 1 expires APPROVED licences past validUntil
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
    tradeFaaAstLicense: {
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
  runFaaAstExpiryAndReminders,
  bucketForDaysRemaining,
} from "./faa-ast-reminder-service";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
  mockMemberFindMany.mockResolvedValue([]);
  mockNotifFindFirst.mockResolvedValue(null);
  mockNotifCreate.mockResolvedValue({ id: "notif_1" });
  mockSendEmail.mockResolvedValue({ ok: true });
});

const NOW = new Date("2026-05-23T09:25:00Z");
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

describe("runFaaAstExpiryAndReminders", () => {
  it("Phase 1: expires APPROVED licences past validUntil", async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });
    const summary = await runFaaAstExpiryAndReminders(NOW);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        status: "APPROVED",
        validUntil: { lt: NOW },
      },
      data: { status: "EXPIRED" },
    });
    expect(summary.expired).toBe(3);
  });

  it("Phase 2: emits CRITICAL Notification + email for ≤7-day licence", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_critical",
        organizationId: "org_1",
        licenseType: "PART_450_LAUNCH",
        faaReference: "LRLO 22-119",
        validUntil: inDays(3),
        operatorName: "SpaceX",
        vehicleName: "Falcon 9",
        launchSite: "VSFB SLC-4E",
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "u_1",
        user: { email: "alice@spacex.example", name: "Alice" },
      },
    ]);

    const summary = await runFaaAstExpiryAndReminders(NOW);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    const notifArgs = mockNotifCreate.mock.calls[0][0];
    expect(notifArgs.data.severity).toBe("CRITICAL");
    expect(notifArgs.data.entityType).toBe("trade-faa-ast-license");
    expect(notifArgs.data.entityId).toBe("lic_critical");
  });

  it("Phase 2: WARNING bucket emits Notification but skips email", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_warn",
        organizationId: "org_1",
        licenseType: "PART_450_LAUNCH",
        faaReference: "LRLO 22-220",
        validUntil: inDays(20),
        operatorName: "RocketLab",
        vehicleName: "Electron",
        launchSite: "MARS Wallops",
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "u_1",
        user: { email: "bob@rocketlab.example", name: "Bob" },
      },
    ]);

    const summary = await runFaaAstExpiryAndReminders(NOW);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockNotifCreate.mock.calls[0][0].data.severity).toBe("WARNING");
  });

  it("Idempotency: skips when notification exists in last 24h", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_dup",
        organizationId: "org_1",
        licenseType: "PART_450_LAUNCH",
        faaReference: "LRLO 22-300",
        validUntil: inDays(5),
        operatorName: "Firefly",
        vehicleName: "Alpha",
        launchSite: "VSFB",
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "u_1",
        user: { email: "carol@firefly.example", name: "Carol" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValue({ id: "existing" });

    const summary = await runFaaAstExpiryAndReminders(NOW);
    expect(summary.emittedNotifications).toBe(0);
    expect(summary.emittedEmails).toBe(0);
    expect(mockNotifCreate).not.toHaveBeenCalled();
  });

  it("No recipients → no Notifications", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_orphan",
        organizationId: "org_orphan",
        licenseType: "PART_450_LAUNCH",
        faaReference: "LRLO 22-400",
        validUntil: inDays(5),
        operatorName: "Stoke Space",
        vehicleName: "Nova",
        launchSite: "Kodiak",
      },
    ]);
    mockMemberFindMany.mockResolvedValue([]);

    const summary = await runFaaAstExpiryAndReminders(NOW);
    expect(summary.emittedNotifications).toBe(0);
  });

  it("Per-license error captures in perLicense[] without throwing", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_err",
        organizationId: "org_1",
        licenseType: "PART_450_LAUNCH",
        faaReference: "LRLO 22-500",
        validUntil: inDays(5),
        operatorName: "ABL",
        vehicleName: "RS1",
        launchSite: "Kodiak",
      },
    ]);
    mockMemberFindMany.mockRejectedValue(new Error("DB down"));

    const summary = await runFaaAstExpiryAndReminders(NOW);
    expect(summary.perLicense).toHaveLength(1);
    expect(summary.perLicense[0].ok).toBe(false);
    expect(summary.perLicense[0].error).toMatch(/DB down/);
  });

  it("Summary aggregates totals correctly across multiple licences", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "lic_a",
        organizationId: "org_1",
        licenseType: "PART_450_LAUNCH",
        faaReference: "LRLO 22-AAA",
        validUntil: inDays(3),
        operatorName: "SpaceX",
        vehicleName: "Falcon 9",
        launchSite: "VSFB",
      },
      {
        id: "lic_b",
        organizationId: "org_1",
        licenseType: "PART_450_REENTRY",
        faaReference: "RRLO 22-BBB",
        validUntil: inDays(25),
        operatorName: "SpaceX",
        vehicleName: "Dragon",
        launchSite: "VSFB",
      },
    ]);
    mockMemberFindMany.mockResolvedValue([
      {
        userId: "u_1",
        user: { email: "x@spacex.example", name: "X" },
      },
    ]);

    const summary = await runFaaAstExpiryAndReminders(NOW);
    expect(summary.scanned).toBe(2);
    expect(summary.emittedNotifications).toBe(2);
    // Only the ≤7-day licence triggers email
    expect(summary.emittedEmails).toBe(1);
  });
});
