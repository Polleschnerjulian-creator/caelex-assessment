import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    securityEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  logAuditEvent,
  logAuditEventsBatch,
  getAuditLogs,
  getEntityAuditLogs,
  generateAuditDescription,
  getRequestContext,
  logSecurityEvent,
  getSecurityEvents,
  resolveSecurityEvent,
  getSecurityEventCounts,
} from "@/lib/audit";

describe("Audit Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAuditEvent", () => {
    it("should create audit log entry", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
        description: "Uploaded document",
        timestamp: new Date(),
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
        description: "Uploaded document",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          action: "document_uploaded",
          entityType: "document",
          entityId: "doc-1",
        }),
      });
    });

    it("should stringify previous and new values", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "article_status_changed",
        entityType: "article",
        entityId: "art-1",
        previousValue: { status: "draft" },
        newValue: { status: "published" },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousValue: JSON.stringify({ status: "draft" }),
          newValue: JSON.stringify({ status: "published" }),
        }),
      });
    });

    it("should not throw on error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(prisma.auditLog.create).mockRejectedValue(
        new Error("DB Error"),
      );

      // Should not throw
      await expect(
        logAuditEvent({
          userId: "user-1",
          action: "document_uploaded",
          entityType: "document",
          entityId: "doc-1",
        }),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("logAuditEventsBatch", () => {
    it("should create multiple audit logs", async () => {
      vi.mocked(prisma.auditLog.createMany).mockResolvedValue({ count: 2 });

      await logAuditEventsBatch([
        {
          userId: "user-1",
          action: "document_uploaded",
          entityType: "document",
          entityId: "doc-1",
        },
        {
          userId: "user-1",
          action: "document_uploaded",
          entityType: "document",
          entityId: "doc-2",
        },
      ]);

      expect(prisma.auditLog.createMany).toHaveBeenCalled();
    });
  });

  describe("getAuditLogs", () => {
    it("should fetch audit logs for user", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "user-1",
          action: "create",
          timestamp: new Date(),
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as never);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);

      const result = await getAuditLogs("user-1", { limit: 10, offset: 0 });

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(1);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
          take: 10,
          skip: 0,
        }),
      );
    });

    it("should apply entity type filter", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs("user-1", { entityType: "document" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: "document",
          }),
        }),
      );
    });

    it("should apply date range filter", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      await getAuditLogs("user-1", { startDate, endDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe("getEntityAuditLogs", () => {
    it("should fetch logs for specific entity", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await getEntityAuditLogs("document", "doc-1", 10);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entityType: "document",
            entityId: "doc-1",
          },
          take: 10,
        }),
      );
    });
  });

  describe("generateAuditDescription", () => {
    it("should generate description for article status change", () => {
      const desc = generateAuditDescription(
        "article_status_changed",
        "article",
        { status: "draft" },
        { status: "reviewed" },
      );

      expect(desc).toContain("draft");
      expect(desc).toContain("reviewed");
    });

    it("should generate description for checklist item completed", () => {
      const desc = generateAuditDescription(
        "checklist_item_completed",
        "checklist",
      );

      expect(desc).toContain("completed");
    });

    it("should generate description for document upload", () => {
      const desc = generateAuditDescription("document_uploaded", "document");

      expect(desc).toContain("Uploaded");
    });

    it("should generate description for workflow creation", () => {
      const desc = generateAuditDescription("workflow_created", "workflow");

      expect(desc).toContain("Created authorization workflow");
    });

    it("should generate default description for unknown action", () => {
      const desc = generateAuditDescription(
        "unknown_action" as never,
        "test" as never,
      );

      expect(desc).toContain("unknown_action");
      expect(desc).toContain("test");
    });
  });

  describe("getRequestContext", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const mockRequest = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
          "user-agent": "TestAgent/1.0",
        }),
      } as Request;

      const context = getRequestContext(mockRequest);

      expect(context.ipAddress).toBe("192.168.1.1");
      expect(context.userAgent).toBe("TestAgent/1.0");
    });

    it("should extract IP from x-real-ip header", () => {
      const mockRequest = {
        headers: new Headers({
          "x-real-ip": "192.168.1.1",
        }),
      } as Request;

      const context = getRequestContext(mockRequest);

      expect(context.ipAddress).toBe("192.168.1.1");
    });

    it("should return undefined for missing headers", () => {
      const mockRequest = {
        headers: new Headers(),
      } as Request;

      const context = getRequestContext(mockRequest);

      expect(context.ipAddress).toBeUndefined();
      expect(context.userAgent).toBeUndefined();
    });
  });

  describe("Security Events", () => {
    describe("logSecurityEvent", () => {
      it("should create security event", async () => {
        vi.mocked(prisma.securityEvent.create).mockResolvedValue({
          id: "sec-1",
        } as never);

        await logSecurityEvent(
          "SUSPICIOUS_ACTIVITY",
          "HIGH",
          "Suspicious login attempt",
          { ip: "192.168.1.1" },
        );

        expect(prisma.securityEvent.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: "SUSPICIOUS_ACTIVITY",
            severity: "HIGH",
            description: "Suspicious login attempt",
          }),
        });
      });

      it("should log critical events to console", async () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});
        vi.mocked(prisma.securityEvent.create).mockResolvedValue({
          id: "sec-1",
        } as never);

        await logSecurityEvent(
          "BRUTE_FORCE_ATTEMPT",
          "CRITICAL",
          "Multiple failed login attempts",
        );

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe("getSecurityEvents", () => {
      it("should fetch security events with filters", async () => {
        vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([]);

        await getSecurityEvents({
          severity: "HIGH",
          type: "SUSPICIOUS_ACTIVITY",
          resolved: false,
          limit: 50,
        });

        expect(prisma.securityEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              severity: "HIGH",
              type: "SUSPICIOUS_ACTIVITY",
              resolved: false,
            }),
            take: 50,
          }),
        );
      });
    });

    describe("resolveSecurityEvent", () => {
      it("should mark event as resolved", async () => {
        vi.mocked(prisma.securityEvent.update).mockResolvedValue({
          id: "sec-1",
          resolved: true,
        } as never);

        await resolveSecurityEvent("sec-1", "admin-1");

        expect(prisma.securityEvent.update).toHaveBeenCalledWith({
          where: { id: "sec-1" },
          data: expect.objectContaining({
            resolved: true,
            resolvedBy: "admin-1",
          }),
        });
      });
    });

    describe("getSecurityEventCounts", () => {
      it("should return counts by severity", async () => {
        vi.mocked(prisma.securityEvent.groupBy).mockResolvedValue([
          { severity: "CRITICAL", _count: 1 },
          { severity: "HIGH", _count: 3 },
          { severity: "MEDIUM", _count: 5 },
        ] as never);

        const counts = await getSecurityEventCounts();

        expect(counts.critical).toBe(1);
        expect(counts.high).toBe(3);
        expect(counts.medium).toBe(5);
        expect(counts.total).toBe(9);
      });
    });
  });
});
