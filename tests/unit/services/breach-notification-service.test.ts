import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    breachReport: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    security: vi.fn(),
  },
}));

vi.mock("@/lib/services/notification-service", () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
  notifyOrganization: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => Promise.resolve(v)),
  decrypt: vi.fn((v: string) => Promise.resolve(v)),
  isEncrypted: vi.fn(() => false),
}));

// ─── Imports (after mocks) ───

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  notifyUser,
  notifyOrganization,
} from "@/lib/services/notification-service";
import {
  reportBreach,
  getBreachReports,
  getBreachReport,
  updateBreachStatus,
  notifyAuthority,
  notifySubjects,
  getOverdueBreaches,
  processBreachEscalations,
  getBreachStatusLabel,
  getBreachSeverityLabel,
} from "@/lib/services/breach-notification-service";

// ─── Test Helpers ───

const USER_ID = "user-001";
const ORG_ID = "org-001";
const BREACH_ID = "breach-001";

function makeBreachInput(overrides = {}) {
  return {
    title: "Test Data Breach",
    description: "Unauthorized access to customer database",
    severity: "HIGH" as const,
    affectedDataTypes: "email addresses, phone numbers",
    affectedDataSubjects: 1500,
    discoveredAt: new Date("2026-02-10T12:00:00Z"),
    organizationId: ORG_ID,
    ...overrides,
  };
}

function makeBreachRecord(overrides = {}) {
  return {
    id: BREACH_ID,
    reportedById: USER_ID,
    organizationId: ORG_ID,
    title: "Test Data Breach",
    description: "Unauthorized access to customer database",
    severity: "HIGH",
    status: "DETECTED",
    affectedDataTypes: "email addresses, phone numbers",
    affectedDataSubjects: 1500,
    discoveredAt: new Date("2026-02-10T12:00:00Z"),
    reportedAt: new Date("2026-02-10T12:05:00Z"),
    containedAt: null,
    resolvedAt: null,
    authorityNotifiedAt: null,
    subjectsNotifiedAt: null,
    notes: [
      {
        timestamp: "2026-02-10T12:05:00.000Z",
        action: "Breach reported",
        by: USER_ID,
      },
    ],
    createdAt: new Date("2026-02-10T12:05:00Z"),
    updatedAt: new Date("2026-02-10T12:05:00Z"),
    ...overrides,
  };
}

function makeBreachWithReporter(overrides = {}) {
  return {
    ...makeBreachRecord(overrides),
    reportedBy: {
      id: USER_ID,
      name: "Test User",
      email: "test@example.com",
    },
    organization: {
      id: ORG_ID,
      name: "Test Organization",
    },
  };
}

// ─── Tests ───

describe("Breach Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-12T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── reportBreach ───

  describe("reportBreach", () => {
    it("should create a breach report with initial notes and DETECTED status", async () => {
      const input = makeBreachInput();
      const created = makeBreachRecord();
      vi.mocked(prisma.breachReport.create).mockResolvedValue(created as never);

      const result = await reportBreach(USER_ID, input);

      expect(prisma.breachReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportedById: USER_ID,
          organizationId: ORG_ID,
          title: input.title,
          description: input.description,
          severity: "HIGH",
          affectedDataTypes: input.affectedDataTypes,
          affectedDataSubjects: 1500,
          discoveredAt: input.discoveredAt,
          status: "DETECTED",
          notes: expect.arrayContaining([
            expect.objectContaining({
              action: "Breach reported",
              by: USER_ID,
            }),
          ]),
        }),
      });
      expect(result).toEqual(created);
    });

    it("should set organizationId to null when not provided", async () => {
      const input = makeBreachInput({ organizationId: undefined });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord({ organizationId: null }) as never,
      );

      await reportBreach(USER_ID, input);

      expect(prisma.breachReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: null,
        }),
      });
    });

    it("should log a security event with correct severity level", async () => {
      const input = makeBreachInput({ severity: "CRITICAL" });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord({ severity: "CRITICAL" }) as never,
      );

      await reportBreach(USER_ID, input);

      expect(logger.security).toHaveBeenCalledWith(
        "breach_reported",
        expect.objectContaining({
          breachId: BREACH_ID,
          severity: "CRITICAL",
          userId: USER_ID,
          affectedDataSubjects: 1500,
        }),
        "critical",
      );
    });

    it("should log severity as 'high' for non-CRITICAL breaches", async () => {
      const input = makeBreachInput({ severity: "HIGH" });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord({ severity: "HIGH" }) as never,
      );

      await reportBreach(USER_ID, input);

      expect(logger.security).toHaveBeenCalledWith(
        "breach_reported",
        expect.anything(),
        "high",
      );
    });

    it("should send notification to the reporter", async () => {
      const input = makeBreachInput();
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await reportBreach(USER_ID, input);

      expect(notifyUser).toHaveBeenCalledWith(
        USER_ID,
        "BREACH_REPORTED",
        expect.stringContaining("Breach Report Created"),
        expect.stringContaining("Severity: HIGH"),
        expect.objectContaining({
          actionUrl: `/dashboard/security/breach-reports/${BREACH_ID}`,
          entityType: "breach_report",
          entityId: BREACH_ID,
          severity: "CRITICAL",
        }),
      );
    });

    it("should include authority notification deadline in reporter notification", async () => {
      const input = makeBreachInput();
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await reportBreach(USER_ID, input);

      // The deadline should be 72 hours after discoveredAt (2026-02-10T12:00:00Z)
      // = 2026-02-13T12:00:00.000Z
      expect(notifyUser).toHaveBeenCalledWith(
        USER_ID,
        "BREACH_REPORTED",
        expect.any(String),
        expect.stringContaining("2026-02-13T12:00:00.000Z"),
        expect.any(Object),
      );
    });

    it("should notify organization admins when organizationId is provided", async () => {
      const input = makeBreachInput({ organizationId: ORG_ID });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await reportBreach(USER_ID, input);

      expect(notifyOrganization).toHaveBeenCalledWith(
        ORG_ID,
        "BREACH_REPORTED",
        expect.stringContaining("[BREACH]"),
        expect.stringContaining("72 hours"),
        expect.objectContaining({
          excludeUserIds: [USER_ID],
          severity: "CRITICAL",
        }),
      );
    });

    it("should NOT notify organization when organizationId is not provided", async () => {
      const input = makeBreachInput({ organizationId: undefined });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord({ organizationId: null }) as never,
      );

      await reportBreach(USER_ID, input);

      expect(notifyOrganization).not.toHaveBeenCalled();
    });

    it("should still return the breach if notifyUser throws", async () => {
      const input = makeBreachInput();
      const created = makeBreachRecord();
      vi.mocked(prisma.breachReport.create).mockResolvedValue(created as never);
      vi.mocked(notifyUser).mockRejectedValueOnce(
        new Error("Email service down"),
      );

      const result = await reportBreach(USER_ID, input);

      expect(result).toEqual(created);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send breach notification to reporter",
        expect.any(Error),
        expect.objectContaining({ breachId: BREACH_ID }),
      );
    });

    it("should still return the breach if notifyOrganization throws", async () => {
      const input = makeBreachInput({ organizationId: ORG_ID });
      const created = makeBreachRecord();
      vi.mocked(prisma.breachReport.create).mockResolvedValue(created as never);
      vi.mocked(notifyOrganization).mockRejectedValueOnce(
        new Error("Notification failed"),
      );

      const result = await reportBreach(USER_ID, input);

      expect(result).toEqual(created);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send breach notification to organization",
        expect.any(Error),
        expect.objectContaining({
          breachId: BREACH_ID,
          organizationId: ORG_ID,
        }),
      );
    });
  });

  // ─── getBreachReports ───

  describe("getBreachReports", () => {
    it("should filter by organizationId when provided", async () => {
      const reports = [makeBreachWithReporter()];
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue(
        reports as never,
      );
      vi.mocked(prisma.breachReport.count).mockResolvedValue(1 as never);

      const result = await getBreachReports(USER_ID, {
        organizationId: ORG_ID,
      });

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: ORG_ID }),
        }),
      );
      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter by reportedById when no organizationId is given", async () => {
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.breachReport.count).mockResolvedValue(0 as never);

      await getBreachReports(USER_ID);

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reportedById: USER_ID }),
        }),
      );
    });

    it("should apply status and severity filters", async () => {
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.breachReport.count).mockResolvedValue(0 as never);

      await getBreachReports(USER_ID, {
        organizationId: ORG_ID,
        status: "DETECTED" as const,
        severity: "CRITICAL" as const,
      });

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_ID,
            status: "DETECTED",
            severity: "CRITICAL",
          }),
        }),
      );
    });

    it("should respect limit and offset options", async () => {
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.breachReport.count).mockResolvedValue(0 as never);

      await getBreachReports(USER_ID, {
        organizationId: ORG_ID,
        limit: 10,
        offset: 20,
      });

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should default to limit 50 and offset 0", async () => {
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.breachReport.count).mockResolvedValue(0 as never);

      await getBreachReports(USER_ID, { organizationId: ORG_ID });

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it("should order by reportedAt desc and include reporter/org", async () => {
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.breachReport.count).mockResolvedValue(0 as never);

      await getBreachReports(USER_ID, { organizationId: ORG_ID });

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { reportedAt: "desc" },
          include: expect.objectContaining({
            reportedBy: {
              select: { id: true, name: true, email: true },
            },
            organization: {
              select: { id: true, name: true },
            },
          }),
        }),
      );
    });
  });

  // ─── getBreachReport ───

  describe("getBreachReport", () => {
    it("should find report by id with access check (reporter or org member)", async () => {
      const report = makeBreachWithReporter();
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        report as never,
      );

      const result = await getBreachReport(BREACH_ID, USER_ID);

      expect(prisma.breachReport.findFirst).toHaveBeenCalledWith({
        where: {
          id: BREACH_ID,
          OR: [
            { reportedById: USER_ID },
            {
              organization: {
                members: { some: { userId: USER_ID } },
              },
            },
          ],
        },
        include: expect.objectContaining({
          reportedBy: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true } },
        }),
      });
      expect(result).toEqual(report);
    });

    it("should return null when report is not found or user has no access", async () => {
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(null as never);

      const result = await getBreachReport(BREACH_ID, "other-user");

      expect(result).toBeNull();
    });
  });

  // ─── updateBreachStatus ───

  describe("updateBreachStatus", () => {
    it("should throw if breach report not found", async () => {
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(null as never);

      await expect(
        updateBreachStatus(BREACH_ID, USER_ID, {
          status: "INVESTIGATING" as const,
        }),
      ).rejects.toThrow("Breach report not found");
    });

    it("should append a timeline entry with status change", async () => {
      const current = makeBreachRecord({ status: "DETECTED" });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({ status: "INVESTIGATING" }) as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "INVESTIGATING" as const,
      });

      expect(prisma.breachReport.update).toHaveBeenCalledWith({
        where: { id: BREACH_ID },
        data: expect.objectContaining({
          status: "INVESTIGATING",
          notes: expect.arrayContaining([
            // Original note preserved
            expect.objectContaining({ action: "Breach reported" }),
            // New status change note
            expect.objectContaining({
              action: "Status changed from DETECTED to INVESTIGATING",
              by: USER_ID,
            }),
          ]),
        }),
      });
    });

    it("should include optional notes in timeline entry", async () => {
      const current = makeBreachRecord();
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({ status: "INVESTIGATING" }) as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "INVESTIGATING" as const,
        notes: "Analysis in progress",
      });

      expect(prisma.breachReport.update).toHaveBeenCalledWith({
        where: { id: BREACH_ID },
        data: expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({
              action:
                "Status changed from DETECTED to INVESTIGATING: Analysis in progress",
            }),
          ]),
        }),
      });
    });

    it("should set containedAt when status changes to CONTAINED", async () => {
      const current = makeBreachRecord({
        status: "INVESTIGATING",
        containedAt: null,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({ status: "CONTAINED" }) as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "CONTAINED" as const,
      });

      expect(prisma.breachReport.update).toHaveBeenCalledWith({
        where: { id: BREACH_ID },
        data: expect.objectContaining({
          status: "CONTAINED",
          containedAt: expect.any(Date),
        }),
      });
    });

    it("should NOT overwrite containedAt if already set", async () => {
      const existingContainedAt = new Date("2026-02-11T10:00:00Z");
      const current = makeBreachRecord({
        status: "CONTAINED",
        containedAt: existingContainedAt,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "CONTAINED" as const,
      });

      const updateCall = vi.mocked(prisma.breachReport.update).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("containedAt");
    });

    it("should set resolvedAt when status changes to RESOLVED", async () => {
      const current = makeBreachRecord({
        status: "CONTAINED",
        resolvedAt: null,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({ status: "RESOLVED" }) as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "RESOLVED" as const,
      });

      expect(prisma.breachReport.update).toHaveBeenCalledWith({
        where: { id: BREACH_ID },
        data: expect.objectContaining({
          status: "RESOLVED",
          resolvedAt: expect.any(Date),
        }),
      });
    });

    it("should NOT overwrite resolvedAt if already set", async () => {
      const existingResolvedAt = new Date("2026-02-11T18:00:00Z");
      const current = makeBreachRecord({
        status: "RESOLVED",
        resolvedAt: existingResolvedAt,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "RESOLVED" as const,
      });

      const updateCall = vi.mocked(prisma.breachReport.update).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("resolvedAt");
    });

    it("should handle empty notes on existing breach", async () => {
      const current = makeBreachRecord({ notes: null });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({ status: "INVESTIGATING" }) as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "INVESTIGATING" as const,
      });

      expect(prisma.breachReport.update).toHaveBeenCalledWith({
        where: { id: BREACH_ID },
        data: expect.objectContaining({
          notes: [
            expect.objectContaining({
              action: "Status changed from DETECTED to INVESTIGATING",
            }),
          ],
        }),
      });
    });

    it("should log the status update", async () => {
      const current = makeBreachRecord();
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({ status: "INVESTIGATING" }) as never,
      );

      await updateBreachStatus(BREACH_ID, USER_ID, {
        status: "INVESTIGATING" as const,
      });

      expect(logger.info).toHaveBeenCalledWith("Breach status updated", {
        breachId: BREACH_ID,
        previousStatus: "DETECTED",
        newStatus: "INVESTIGATING",
        updatedBy: USER_ID,
      });
    });
  });

  // ─── notifyAuthority (GDPR Art. 33) ───

  describe("notifyAuthority", () => {
    it("should throw if breach report not found", async () => {
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(null as never);

      await expect(notifyAuthority(BREACH_ID, USER_ID)).rejects.toThrow(
        "Breach report not found",
      );
    });

    it("should throw if authority has already been notified", async () => {
      const current = makeBreachRecord({
        authorityNotifiedAt: new Date("2026-02-11T06:00:00Z"),
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );

      await expect(notifyAuthority(BREACH_ID, USER_ID)).rejects.toThrow(
        "Authority has already been notified for this breach",
      );
    });

    it("should set authorityNotifiedAt and add timeline note", async () => {
      const current = makeBreachRecord({ authorityNotifiedAt: null });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({
          authorityNotifiedAt: new Date("2026-02-12T12:00:00Z"),
        }) as never,
      );

      const result = await notifyAuthority(BREACH_ID, USER_ID);

      expect(prisma.breachReport.update).toHaveBeenCalledWith({
        where: { id: BREACH_ID },
        data: {
          authorityNotifiedAt: expect.any(Date),
          notes: expect.arrayContaining([
            expect.objectContaining({
              action: "Supervisory authority notified (GDPR Art. 33)",
              by: USER_ID,
            }),
          ]),
        },
      });
      expect(result.authorityNotifiedAt).toBeTruthy();
    });

    it("should log hours since discovery for compliance tracking", async () => {
      // discoveredAt is 2026-02-10T12:00:00Z, current time is 2026-02-12T12:00:00Z = 48h
      const current = makeBreachRecord({
        discoveredAt: new Date("2026-02-10T12:00:00Z"),
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await notifyAuthority(BREACH_ID, USER_ID);

      expect(logger.info).toHaveBeenCalledWith(
        "Breach authority notification recorded",
        expect.objectContaining({
          breachId: BREACH_ID,
          notifiedBy: USER_ID,
          hoursAfterDiscovery: 48,
        }),
      );
    });

    it("should preserve existing notes when adding authority notification note", async () => {
      const existingNotes = [
        {
          timestamp: "2026-02-10T12:05:00Z",
          action: "Breach reported",
          by: USER_ID,
        },
        {
          timestamp: "2026-02-10T14:00:00Z",
          action: "Status changed from DETECTED to INVESTIGATING",
          by: USER_ID,
        },
      ];
      const current = makeBreachRecord({
        notes: existingNotes,
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await notifyAuthority(BREACH_ID, USER_ID);

      const updateCall = vi.mocked(prisma.breachReport.update).mock.calls[0][0];
      const notes = updateCall.data.notes as Array<Record<string, string>>;
      expect(notes).toHaveLength(3);
      expect(notes[0].action).toBe("Breach reported");
      expect(notes[1].action).toContain("Status changed");
      expect(notes[2].action).toBe(
        "Supervisory authority notified (GDPR Art. 33)",
      );
    });
  });

  // ─── notifySubjects (GDPR Art. 34) ───

  describe("notifySubjects", () => {
    it("should throw if breach report not found", async () => {
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(null as never);

      await expect(notifySubjects(BREACH_ID, USER_ID)).rejects.toThrow(
        "Breach report not found",
      );
    });

    it("should throw if subjects have already been notified", async () => {
      const current = makeBreachRecord({
        subjectsNotifiedAt: new Date("2026-02-11T10:00:00Z"),
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );

      await expect(notifySubjects(BREACH_ID, USER_ID)).rejects.toThrow(
        "Data subjects have already been notified for this breach",
      );
    });

    it("should set subjectsNotifiedAt and add timeline note", async () => {
      const current = makeBreachRecord({ subjectsNotifiedAt: null });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord({
          subjectsNotifiedAt: new Date("2026-02-12T12:00:00Z"),
        }) as never,
      );

      const result = await notifySubjects(BREACH_ID, USER_ID);

      expect(prisma.breachReport.update).toHaveBeenCalledWith({
        where: { id: BREACH_ID },
        data: {
          subjectsNotifiedAt: expect.any(Date),
          notes: expect.arrayContaining([
            expect.objectContaining({
              action: "Affected data subjects notified (GDPR Art. 34)",
              by: USER_ID,
            }),
          ]),
        },
      });
      expect(result.subjectsNotifiedAt).toBeTruthy();
    });

    it("should log notification details including affected count", async () => {
      const current = makeBreachRecord({
        subjectsNotifiedAt: null,
        affectedDataSubjects: 3200,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await notifySubjects(BREACH_ID, USER_ID);

      expect(logger.info).toHaveBeenCalledWith(
        "Breach subject notification recorded",
        expect.objectContaining({
          breachId: BREACH_ID,
          notifiedBy: USER_ID,
          affectedSubjects: 3200,
        }),
      );
    });
  });

  // ─── GDPR 72-hour Deadline Calculation ───

  describe("GDPR 72-hour deadline", () => {
    it("should correctly calculate authority notification deadline", async () => {
      const discoveredAt = new Date("2026-02-10T12:00:00Z");
      const input = makeBreachInput({ discoveredAt });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord({ discoveredAt }) as never,
      );

      await reportBreach(USER_ID, input);

      // The deadline is 72 hours after discovery = 2026-02-13T12:00:00.000Z
      const reporterNotifCall = vi.mocked(notifyUser).mock.calls[0];
      const messageBody = reporterNotifCall[3]; // 4th arg is the message
      expect(messageBody).toContain("2026-02-13T12:00:00.000Z");
    });

    it("should include 72-hour deadline in organization notification", async () => {
      const discoveredAt = new Date("2026-02-10T12:00:00Z");
      const input = makeBreachInput({ discoveredAt, organizationId: ORG_ID });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord({ discoveredAt }) as never,
      );

      await reportBreach(USER_ID, input);

      const orgNotifCall = vi.mocked(notifyOrganization).mock.calls[0];
      const orgMessage = orgNotifCall[3]; // 4th arg is the message
      expect(orgMessage).toContain("72 hours");
    });
  });

  // ─── getOverdueBreaches ───

  describe("getOverdueBreaches", () => {
    it("should query breaches past 48h escalation window without authority notification", async () => {
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);

      await getOverdueBreaches();

      // Current time is 2026-02-12T12:00:00Z
      // Warning cutoff = current - 48h = 2026-02-10T12:00:00Z
      const expectedCutoff = new Date("2026-02-10T12:00:00Z");

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ["DETECTED", "INVESTIGATING"] },
          authorityNotifiedAt: null,
          discoveredAt: { lte: expectedCutoff },
        },
        include: {
          reportedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { discoveredAt: "asc" },
      });
    });

    it("should return breaches ordered by discoveredAt ascending (oldest first)", async () => {
      const breaches = [
        makeBreachRecord({
          id: "breach-old",
          discoveredAt: new Date("2026-02-09T00:00:00Z"),
        }),
        makeBreachRecord({
          id: "breach-newer",
          discoveredAt: new Date("2026-02-10T00:00:00Z"),
        }),
      ];
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue(
        breaches as never,
      );

      const result = await getOverdueBreaches();

      expect(result).toHaveLength(2);
      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { discoveredAt: "asc" },
        }),
      );
    });
  });

  // ─── processBreachEscalations ───

  describe("processBreachEscalations", () => {
    it("should return zero escalated and no errors when no overdue breaches exist", async () => {
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);

      const result = await processBreachEscalations();

      expect(result).toEqual({ escalated: 0, errors: [] });
    });

    it("should send URGENT notification for breach approaching deadline (< 72h)", async () => {
      // discoveredAt = 50h ago (within 48-72h window), so 22h remain
      const discoveredAt = new Date(Date.now() - 50 * 60 * 60 * 1000);
      const breach = makeBreachRecord({
        discoveredAt,
        organizationId: null,
        status: "DETECTED",
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach,
      ] as never);

      const result = await processBreachEscalations();

      expect(result.escalated).toBe(1);
      expect(result.errors).toHaveLength(0);

      expect(notifyUser).toHaveBeenCalledWith(
        USER_ID,
        "BREACH_AUTHORITY_DEADLINE",
        expect.stringContaining("[URGENT]"),
        expect.stringContaining("requires supervisory authority notification"),
        expect.objectContaining({
          severity: "URGENT",
          actionUrl: `/dashboard/security/breach-reports/${BREACH_ID}`,
        }),
      );
    });

    it("should send OVERDUE/CRITICAL notification for breach past 72h deadline", async () => {
      // discoveredAt = 80h ago, past the 72h deadline
      const discoveredAt = new Date(Date.now() - 80 * 60 * 60 * 1000);
      const breach = makeBreachRecord({
        discoveredAt,
        organizationId: null,
        status: "DETECTED",
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach,
      ] as never);

      const result = await processBreachEscalations();

      expect(result.escalated).toBe(1);
      expect(notifyUser).toHaveBeenCalledWith(
        USER_ID,
        "BREACH_AUTHORITY_DEADLINE",
        expect.stringContaining("[OVERDUE]"),
        expect.stringContaining("exceeded the 72-hour GDPR Art. 33"),
        expect.objectContaining({
          severity: "CRITICAL",
        }),
      );
    });

    it("should also notify organization for org-scoped breaches", async () => {
      const discoveredAt = new Date(Date.now() - 60 * 60 * 60 * 1000);
      const breach = makeBreachRecord({
        discoveredAt,
        organizationId: ORG_ID,
        status: "INVESTIGATING",
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach,
      ] as never);

      await processBreachEscalations();

      expect(notifyOrganization).toHaveBeenCalledWith(
        ORG_ID,
        "BREACH_ESCALATED",
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          excludeUserIds: [USER_ID],
          entityType: "breach_report",
          entityId: BREACH_ID,
        }),
      );
    });

    it("should NOT notify organization when breach has no organizationId", async () => {
      const discoveredAt = new Date(Date.now() - 60 * 60 * 60 * 1000);
      const breach = makeBreachRecord({
        discoveredAt,
        organizationId: null,
        status: "DETECTED",
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach,
      ] as never);

      await processBreachEscalations();

      expect(notifyOrganization).not.toHaveBeenCalled();
    });

    it("should process multiple breaches and count each escalated", async () => {
      const breaches = [
        makeBreachRecord({
          id: "breach-1",
          discoveredAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
          organizationId: null,
          authorityNotifiedAt: null,
        }),
        makeBreachRecord({
          id: "breach-2",
          discoveredAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
          organizationId: null,
          authorityNotifiedAt: null,
        }),
        makeBreachRecord({
          id: "breach-3",
          discoveredAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
          organizationId: ORG_ID,
          authorityNotifiedAt: null,
        }),
      ];
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue(
        breaches as never,
      );

      const result = await processBreachEscalations();

      expect(result.escalated).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(notifyUser).toHaveBeenCalledTimes(3);
    });

    it("should collect errors without stopping when individual notifications fail", async () => {
      const breach1 = makeBreachRecord({
        id: "breach-1",
        discoveredAt: new Date(Date.now() - 60 * 60 * 60 * 1000),
        organizationId: null,
        authorityNotifiedAt: null,
      });
      const breach2 = makeBreachRecord({
        id: "breach-2",
        reportedById: "user-002",
        discoveredAt: new Date(Date.now() - 70 * 60 * 60 * 1000),
        organizationId: null,
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach1,
        breach2,
      ] as never);

      // First breach notification fails
      vi.mocked(notifyUser)
        .mockRejectedValueOnce(new Error("Notification service unavailable"))
        .mockResolvedValueOnce(undefined as never);

      const result = await processBreachEscalations();

      // First fails, second succeeds
      expect(result.escalated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("breach-1");
      expect(result.errors[0]).toContain("Notification service unavailable");
    });

    it("should handle query failure gracefully", async () => {
      vi.mocked(prisma.breachReport.findMany).mockRejectedValue(
        new Error("Database connection lost"),
      );

      const result = await processBreachEscalations();

      expect(result.escalated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to query overdue breaches");
      expect(result.errors[0]).toContain("Database connection lost");
    });

    it("should include hours remaining in URGENT notification message", async () => {
      // 55h ago => 72 - 55 = 17h remaining
      const discoveredAt = new Date(Date.now() - 55 * 60 * 60 * 1000);
      const breach = makeBreachRecord({
        discoveredAt,
        organizationId: null,
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach,
      ] as never);

      await processBreachEscalations();

      const userNotifCall = vi.mocked(notifyUser).mock.calls[0];
      const title = userNotifCall[2];
      // 72 - 55 = 17, Math.ceil(17) = 17
      expect(title).toContain("17h");
    });

    it("should include hours since discovery in OVERDUE notification message", async () => {
      // 100h ago => past deadline
      const discoveredAt = new Date(Date.now() - 100 * 60 * 60 * 1000);
      const breach = makeBreachRecord({
        discoveredAt,
        organizationId: null,
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach,
      ] as never);

      await processBreachEscalations();

      const userNotifCall = vi.mocked(notifyUser).mock.calls[0];
      const message = userNotifCall[3];
      // Math.floor(100) = 100
      expect(message).toContain("100h ago");
    });
  });

  // ─── getBreachStatusLabel ───

  describe("getBreachStatusLabel", () => {
    it.each([
      ["DETECTED", "Detected"],
      ["INVESTIGATING", "Investigating"],
      ["CONTAINED", "Contained"],
      ["RESOLVED", "Resolved"],
      ["CLOSED", "Closed"],
    ] as const)("should return '%s' label as '%s'", (status, expectedLabel) => {
      expect(getBreachStatusLabel(status as never)).toBe(expectedLabel);
    });

    it("should return the raw status string for unknown values", () => {
      expect(getBreachStatusLabel("UNKNOWN_STATUS" as never)).toBe(
        "UNKNOWN_STATUS",
      );
    });
  });

  // ─── getBreachSeverityLabel ───

  describe("getBreachSeverityLabel", () => {
    it.each([
      ["LOW", "Low"],
      ["MEDIUM", "Medium"],
      ["HIGH", "High"],
      ["CRITICAL", "Critical"],
    ] as const)(
      "should return '%s' severity as '%s'",
      (severity, expectedLabel) => {
        expect(getBreachSeverityLabel(severity as never)).toBe(expectedLabel);
      },
    );

    it("should return the raw severity string for unknown values", () => {
      expect(getBreachSeverityLabel("EXTREME" as never)).toBe("EXTREME");
    });
  });

  // ─── Edge cases ───

  describe("edge cases", () => {
    it("should handle breach discovered exactly at 72h boundary", async () => {
      // Exactly 72h ago => 0 hours remaining, should be treated as past deadline
      const discoveredAt = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const breach = makeBreachRecord({
        discoveredAt,
        organizationId: null,
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([
        breach,
      ] as never);

      await processBreachEscalations();

      const userNotifCall = vi.mocked(notifyUser).mock.calls[0];
      const title = userNotifCall[2];
      expect(title).toContain("[OVERDUE]");
    });

    it("should handle breach discovered exactly at 48h escalation boundary", async () => {
      const warningCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

      vi.mocked(prisma.breachReport.findMany).mockResolvedValue([] as never);

      await getOverdueBreaches();

      expect(prisma.breachReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            discoveredAt: { lte: warningCutoff },
          }),
        }),
      );
    });

    it("should handle breach with zero affected subjects", async () => {
      const input = makeBreachInput({ affectedDataSubjects: 0 });
      vi.mocked(prisma.breachReport.create).mockResolvedValue(
        makeBreachRecord({ affectedDataSubjects: 0 }) as never,
      );

      const result = await reportBreach(USER_ID, input);

      expect(prisma.breachReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          affectedDataSubjects: 0,
        }),
      });
      expect(result.affectedDataSubjects).toBe(0);
    });

    it("should handle notifyAuthority being called with null notes on breach", async () => {
      const current = makeBreachRecord({
        notes: null,
        authorityNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord() as never,
      );

      // Should not throw
      await notifyAuthority(BREACH_ID, USER_ID);

      const updateCall = vi.mocked(prisma.breachReport.update).mock.calls[0][0];
      const notes = updateCall.data.notes as Array<Record<string, string>>;
      expect(notes).toHaveLength(1);
      expect(notes[0].action).toBe(
        "Supervisory authority notified (GDPR Art. 33)",
      );
    });

    it("should handle notifySubjects being called with null notes on breach", async () => {
      const current = makeBreachRecord({
        notes: null,
        subjectsNotifiedAt: null,
      });
      vi.mocked(prisma.breachReport.findFirst).mockResolvedValue(
        current as never,
      );
      vi.mocked(prisma.breachReport.update).mockResolvedValue(
        makeBreachRecord() as never,
      );

      await notifySubjects(BREACH_ID, USER_ID);

      const updateCall = vi.mocked(prisma.breachReport.update).mock.calls[0][0];
      const notes = updateCall.data.notes as Array<Record<string, string>>;
      expect(notes).toHaveLength(1);
      expect(notes[0].action).toBe(
        "Affected data subjects notified (GDPR Art. 34)",
      );
    });
  });
});
