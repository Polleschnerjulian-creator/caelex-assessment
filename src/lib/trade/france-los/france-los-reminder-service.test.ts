/**
 * Tests for france-los-reminder-service.ts (Z34-FR, Tier 4).
 *
 * Coverage (8 cases):
 *   1. bucketForDaysRemaining picks CRITICAL_7 for 5 days
 *   2. bucketForDaysRemaining picks WARN_30 for 20 days
 *   3. bucketForDaysRemaining picks INFO_90 for 60 days
 *   4. bucketForDaysRemaining returns null for >90 days
 *   5. CRITICAL boundary — exactly 7 days falls in CRITICAL_7
 *   6. WARN boundary — exactly 30 days falls in WARN_30
 *   7. INFO boundary — exactly 90 days falls in INFO_90
 *   8. runFranceLosReminders: zero candidates → empty summary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockLosFindMany,
  mockMemberFindMany,
  mockNotifFindFirst,
  mockNotifCreate,
} = vi.hoisted(() => ({
  mockLosFindMany: vi.fn(),
  mockMemberFindMany: vi.fn(),
  mockNotifFindFirst: vi.fn(),
  mockNotifCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeFranceLosAuthorisation: { findMany: mockLosFindMany },
    organizationMember: { findMany: mockMemberFindMany },
    notification: {
      findFirst: mockNotifFindFirst,
      create: mockNotifCreate,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendTradeLicenseExpiry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  bucketForDaysRemaining,
  runFranceLosReminders,
} from "./france-los-reminder-service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bucketForDaysRemaining", () => {
  it("picks CRITICAL_7 for 5 days remaining", () => {
    expect(bucketForDaysRemaining(5)?.bucket).toBe("CRITICAL_7");
  });

  it("picks WARN_30 for 20 days remaining", () => {
    expect(bucketForDaysRemaining(20)?.bucket).toBe("WARN_30");
  });

  it("picks INFO_90 for 60 days remaining", () => {
    expect(bucketForDaysRemaining(60)?.bucket).toBe("INFO_90");
  });

  it("returns null for >90 days remaining", () => {
    expect(bucketForDaysRemaining(120)).toBeNull();
  });

  it("CRITICAL boundary — exactly 7 days falls in CRITICAL_7", () => {
    expect(bucketForDaysRemaining(7)?.bucket).toBe("CRITICAL_7");
  });

  it("WARN boundary — exactly 30 days falls in WARN_30", () => {
    expect(bucketForDaysRemaining(30)?.bucket).toBe("WARN_30");
  });

  it("INFO boundary — exactly 90 days falls in INFO_90", () => {
    expect(bucketForDaysRemaining(90)?.bucket).toBe("INFO_90");
  });

  it("severity escalates from INFO → WARNING → CRITICAL", () => {
    expect(bucketForDaysRemaining(60)?.severity).toBe("INFO");
    expect(bucketForDaysRemaining(20)?.severity).toBe("WARNING");
    expect(bucketForDaysRemaining(5)?.severity).toBe("CRITICAL");
  });
});

describe("runFranceLosReminders", () => {
  it("zero candidates → empty summary with timing data", async () => {
    mockLosFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const summary = await runFranceLosReminders(
      new Date("2026-05-23T09:20:00Z"),
    );
    expect(summary.scanned).toBe(0);
    expect(summary.emittedNotifications).toBe(0);
    expect(summary.emittedEmails).toBe(0);
    expect(summary.perLos).toEqual([]);
    expect(summary.totalElapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("emits one INFO notification for one LOS in 60-day expiry bucket", async () => {
    const validUntil = new Date("2026-07-22T00:00:00Z"); // 60 days from now
    mockLosFindMany
      .mockResolvedValueOnce([
        {
          id: "los_1",
          organizationId: "org_1",
          missionName: "Ariane 6 VA-261",
          operatorName: "ArianeGroup SAS",
          authorisationType: "LAUNCH",
          validUntil,
          cnesReference: "DGE-LOS-2026-0042",
        },
      ])
      .mockResolvedValueOnce([]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_1",
        user: { email: "ops@arianegroup.fr", name: "Ops" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValueOnce(null);
    mockNotifCreate.mockResolvedValueOnce({ id: "notif_1" });

    const summary = await runFranceLosReminders(
      new Date("2026-05-23T09:20:00Z"),
    );

    expect(summary.scanned).toBe(1);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(0);
    expect(summary.perLos[0]?.ok).toBe(true);
    expect(summary.perLos[0]?.bucket).toBe("INFO_90");
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "trade-france-los",
          entityId: "los_1",
          type: "DOCUMENT_EXPIRY",
          severity: "INFO",
        }),
      }),
    );
  });

  it("skips dispatch when an existing notification exists within 24h", async () => {
    const validUntil = new Date("2026-06-22T00:00:00Z"); // ~30 days
    mockLosFindMany
      .mockResolvedValueOnce([
        {
          id: "los_1",
          organizationId: "org_1",
          missionName: "Mission X",
          operatorName: "Op",
          authorisationType: "OPERATION_IN_ORBIT",
          validUntil,
          cnesReference: null,
        },
      ])
      .mockResolvedValueOnce([]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_1",
        user: { email: "ops@example.com", name: "Ops" },
      },
    ]);
    // Existing notification within 24h — idempotency
    mockNotifFindFirst.mockResolvedValueOnce({ id: "existing" });

    const summary = await runFranceLosReminders(
      new Date("2026-05-23T09:20:00Z"),
    );

    expect(mockNotifCreate).not.toHaveBeenCalled();
    expect(summary.emittedNotifications).toBe(0);
    expect(summary.perLos[0]?.notificationsCreated).toBe(0);
  });

  it("emits SUBMITTED_STALE notification for SUBMITTED row >14d", async () => {
    mockLosFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "los_2",
        organizationId: "org_1",
        missionName: "Stale Mission",
        operatorName: "Op",
        authorisationType: "LAUNCH",
        submittedAt: new Date("2026-05-01T00:00:00Z"),
        cnesReference: null,
      },
    ]);
    mockMemberFindMany.mockResolvedValueOnce([{ userId: "user_1" }]);
    mockNotifFindFirst.mockResolvedValueOnce(null);
    mockNotifCreate.mockResolvedValueOnce({ id: "notif_2" });

    const summary = await runFranceLosReminders(
      new Date("2026-05-23T09:20:00Z"),
    );

    expect(summary.scanned).toBe(1);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.perLos[0]?.bucket).toBe("SUBMITTED_STALE");
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "SYSTEM_UPDATE",
        }),
      }),
    );
  });
});
