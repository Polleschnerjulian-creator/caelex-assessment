/**
 * Tests for src/lib/trade/supplement-2/supplement-2-reminder-service.ts (Z29, Tier 4).
 *
 * Coverage (8 cases):
 *   1. bucketForDaysRemaining: CRITICAL_0 wins at 0 and negative
 *   2. bucketForDaysRemaining: WARN_3 for 1..3
 *   3. bucketForDaysRemaining: INFO_14 for 4..14
 *   4. bucketForDaysRemaining: null beyond 14
 *   5. Phase 1: DRAFT past dueDate → OVERDUE bulk update
 *   6. Reminder skips reports already notified within 24h (idempotency)
 *   7. CRITICAL bucket dispatches email; WARN/INFO do not
 *   8. Summary aggregates counts across reports
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockReportUpdateMany,
  mockReportFindMany,
  mockMemberFindMany,
  mockNotifFindFirst,
  mockNotifCreate,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockReportUpdateMany: vi.fn(),
  mockReportFindMany: vi.fn(),
  mockMemberFindMany: vi.fn(),
  mockNotifFindFirst: vi.fn(),
  mockNotifCreate: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeSupplement2Report: {
      updateMany: mockReportUpdateMany,
      findMany: mockReportFindMany,
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
  runSupplement2RemindersAndOverdue,
  bucketForDaysRemaining,
} from "./supplement-2-reminder-service";

const NOW = new Date("2026-07-21T00:00:00.000Z"); // 10 days before Jul 31 due

beforeEach(() => {
  vi.clearAllMocks();
  mockReportUpdateMany.mockResolvedValue({ count: 0 });
  mockReportFindMany.mockResolvedValue([]);
  mockMemberFindMany.mockResolvedValue([]);
  mockNotifFindFirst.mockResolvedValue(null);
  mockNotifCreate.mockResolvedValue({ id: "notif_new" });
  mockSendEmail.mockResolvedValue({ success: true });
});

function reportDueIn(days: number, overrides: Record<string, unknown> = {}) {
  const dueDate = new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    id: `report_${days}`,
    organizationId: "org_1",
    reportingPeriod: days >= 0 ? "2026-H1" : "2025-H2",
    dueDate,
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

  it("returns null beyond 14 days out", () => {
    expect(bucketForDaysRemaining(15)).toBeNull();
    expect(bucketForDaysRemaining(100)).toBeNull();
  });
});

describe("runSupplement2RemindersAndOverdue", () => {
  it("transitions DRAFT past due → OVERDUE in Phase 1", async () => {
    mockReportUpdateMany.mockResolvedValueOnce({ count: 2 });
    const summary = await runSupplement2RemindersAndOverdue(NOW);
    expect(mockReportUpdateMany).toHaveBeenCalledWith({
      where: {
        status: "DRAFT",
        dueDate: { lt: NOW },
      },
      data: { status: "OVERDUE" },
    });
    expect(summary.overdueTransitions).toBe(2);
  });

  it("emits Notification + email for CRITICAL bucket (≤0 days)", async () => {
    mockReportFindMany.mockResolvedValueOnce([reportDueIn(0)]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_a",
        user: { email: "a@example.com", name: "Alice" },
      },
    ]);
    const summary = await runSupplement2RemindersAndOverdue(NOW);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(1);
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: "CRITICAL",
          entityType: "trade-supplement-2",
        }),
      }),
    );
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("emits Notification but NO email for WARN_3 bucket", async () => {
    mockReportFindMany.mockResolvedValueOnce([reportDueIn(3)]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_a",
        user: { email: "a@example.com", name: "Alice" },
      },
    ]);
    const summary = await runSupplement2RemindersAndOverdue(NOW);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ severity: "WARNING" }),
      }),
    );
  });

  it("emits Notification but NO email for INFO_14 bucket", async () => {
    mockReportFindMany.mockResolvedValueOnce([reportDueIn(14)]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_a",
        user: { email: "a@example.com", name: "Alice" },
      },
    ]);
    const summary = await runSupplement2RemindersAndOverdue(NOW);
    expect(summary.emittedNotifications).toBe(1);
    expect(summary.emittedEmails).toBe(0);
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ severity: "INFO" }),
      }),
    );
  });

  it("skips emission when a notification already exists in last 24h", async () => {
    mockReportFindMany.mockResolvedValueOnce([reportDueIn(3)]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_a",
        user: { email: "a@example.com", name: "Alice" },
      },
    ]);
    mockNotifFindFirst.mockResolvedValueOnce({ id: "existing_notif" });
    const summary = await runSupplement2RemindersAndOverdue(NOW);
    expect(summary.emittedNotifications).toBe(0);
    expect(mockNotifCreate).not.toHaveBeenCalled();
  });

  it("aggregates counts across multiple reports + recipients", async () => {
    mockReportFindMany.mockResolvedValueOnce([
      reportDueIn(3, { id: "r1" }),
      reportDueIn(14, { id: "r2", reportingPeriod: "2026-H2" }),
    ]);
    mockMemberFindMany.mockResolvedValue([
      { userId: "user_a", user: { email: "a@example.com", name: "A" } },
      { userId: "user_b", user: { email: "b@example.com", name: "B" } },
    ]);
    const summary = await runSupplement2RemindersAndOverdue(NOW);
    // 2 reports * 2 recipients = 4 notifications
    expect(summary.emittedNotifications).toBe(4);
    expect(summary.scanned).toBe(2);
    expect(summary.perReport).toHaveLength(2);
  });

  // T-M1: OVERDUE reports must be included in Phase 2 so they receive
  // the CRITICAL reminder every run until FILED. Before the fix, Phase 2
  // filtered status="DRAFT" only, so OVERDUE reports (already transitioned
  // in Phase 1) never received a notification or email.
  it("T-M1: OVERDUE report 5 days past due gets CRITICAL notification + email", async () => {
    const overdueReport = {
      id: "report_overdue",
      organizationId: "org_1",
      reportingPeriod: "2025-H2",
      // dueDate is 5 days BEFORE NOW → daysRemaining = -5 → CRITICAL_0 bucket
      dueDate: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000),
      status: "OVERDUE",
    };
    mockReportFindMany.mockResolvedValueOnce([overdueReport]);
    mockMemberFindMany.mockResolvedValueOnce([
      {
        userId: "user_mgr",
        user: { email: "mgr@example.com", name: "Manager" },
      },
    ]);

    const summary = await runSupplement2RemindersAndOverdue(NOW);

    // (a) a CRITICAL notification was created
    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: "CRITICAL",
          entityType: "trade-supplement-2",
          entityId: "report_overdue",
        }),
      }),
    );
    expect(summary.emittedNotifications).toBe(1);

    // (b) the CRITICAL email was dispatched
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(summary.emittedEmails).toBe(1);
  });

  it("T-M1: Phase 2 findMany where includes status OVERDUE (not DRAFT-only)", async () => {
    // Ensure the candidates query explicitly includes OVERDUE so the
    // fix is structurally locked in — not just a behavioural side-effect.
    await runSupplement2RemindersAndOverdue(NOW);

    // findMany is called once for the Phase 2 candidates query
    const candidatesCall = mockReportFindMany.mock.calls[0]?.[0];
    expect(candidatesCall).toBeDefined();
    // The where.status must be an object with an `in` array containing both statuses
    expect(candidatesCall.where.status).toEqual({ in: ["DRAFT", "OVERDUE"] });
  });

  it("collects per-report errors without aborting the run", async () => {
    mockReportFindMany.mockResolvedValueOnce([
      reportDueIn(3, { id: "r1" }),
      reportDueIn(7, { id: "r2" }),
    ]);
    // Recipient lookup is what fails for r2; for r1 it succeeds.
    let memberCallCount = 0;
    mockMemberFindMany.mockImplementation(async () => {
      memberCallCount += 1;
      if (memberCallCount === 2) {
        throw new Error("db hiccup");
      }
      return [
        { userId: "user_a", user: { email: "a@example.com", name: "A" } },
      ];
    });
    const summary = await runSupplement2RemindersAndOverdue(NOW);
    expect(summary.scanned).toBe(2);
    const failed = summary.perReport.find((r) => !r.ok);
    expect(failed).toBeDefined();
    expect(failed?.error).toMatch(/db hiccup/);
    const ok = summary.perReport.find((r) => r.ok);
    expect(ok).toBeDefined();
  });
});
