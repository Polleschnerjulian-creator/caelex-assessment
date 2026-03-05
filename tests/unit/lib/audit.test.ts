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

// Mock the dynamic import of audit-hash.server
vi.mock("@/lib/audit-hash.server", () => ({
  computeHashForNewEntry: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  logAuditEvent,
  logAuditEventsBatch,
  getAuditLogs,
  getEntityAuditLogs,
  exportAuditLogs,
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

    it("should set previousValue and newValue to null when not provided", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousValue: null,
          newValue: null,
        }),
      });
    });

    it("should set organizationId to null when not provided", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: null,
        }),
      });
    });

    it("should include organizationId when provided", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
        organizationId: "org-1",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
        }),
      });
    });

    it("should include ipAddress and userAgent when provided", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
        ipAddress: "192.168.1.1",
        userAgent: "TestAgent/1.0",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: "192.168.1.1",
          userAgent: "TestAgent/1.0",
        }),
      });
    });

    it("should redact PII fields (password) in previousValue", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "user_profile_updated",
        entityType: "user",
        entityId: "user-1",
        previousValue: { password: "secret123", name: "John" },
        newValue: { password: "newSecret456", name: "John Doe" },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousValue: JSON.stringify({
            password: "[REDACTED]",
            name: "John",
          }),
          newValue: JSON.stringify({
            password: "[REDACTED]",
            name: "John Doe",
          }),
        }),
      });
    });

    it("should redact token and accessToken PII fields", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "user_profile_updated",
        entityType: "user",
        entityId: "user-1",
        newValue: {
          token: "abc123",
          accessToken: "xyz789",
          email: "test@test.com",
        },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newValue: JSON.stringify({
            token: "[REDACTED]",
            accessToken: "[REDACTED]",
            email: "test@test.com",
          }),
        }),
      });
    });

    it("should redact PII in nested objects", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "user_profile_updated",
        entityType: "user",
        entityId: "user-1",
        newValue: {
          user: { password: "secret", name: "John" },
          status: "active",
        },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newValue: JSON.stringify({
            user: { password: "[REDACTED]", name: "John" },
            status: "active",
          }),
        }),
      });
    });

    it("should redact PII in arrays", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "user_profile_updated",
        entityType: "user",
        entityId: "user-1",
        newValue: [
          { token: "abc", name: "John" },
          { token: "xyz", name: "Jane" },
        ],
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newValue: JSON.stringify([
            { token: "[REDACTED]", name: "John" },
            { token: "[REDACTED]", name: "Jane" },
          ]),
        }),
      });
    });

    it("should handle hash chain fields from dynamic import", async () => {
      const { computeHashForNewEntry } =
        await import("@/lib/audit-hash.server");
      vi.mocked(computeHashForNewEntry).mockResolvedValue({
        entryHash: "hash-abc",
        previousHash: "hash-prev",
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entryHash: "hash-abc",
          previousHash: "hash-prev",
        }),
      });
    });

    it("should fallback to null hashes when hash computation fails", async () => {
      const { computeHashForNewEntry } =
        await import("@/lib/audit-hash.server");
      vi.mocked(computeHashForNewEntry).mockRejectedValue(
        new Error("Hash failure"),
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logAuditEvent({
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entryHash: null,
          previousHash: null,
        }),
      });
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

    it("should sanitize PII in batch entries", async () => {
      vi.mocked(prisma.auditLog.createMany).mockResolvedValue({ count: 1 });

      await logAuditEventsBatch([
        {
          userId: "user-1",
          action: "user_profile_updated",
          entityType: "user",
          entityId: "user-1",
          previousValue: { password: "old", name: "John" },
          newValue: { password: "new", name: "John Doe" },
        },
      ]);

      const callArgs = vi.mocked(prisma.auditLog.createMany).mock
        .calls[0][0] as {
        data: Array<{ previousValue: string; newValue: string }>;
      };
      expect(callArgs.data[0].previousValue).toBe(
        JSON.stringify({ password: "[REDACTED]", name: "John" }),
      );
      expect(callArgs.data[0].newValue).toBe(
        JSON.stringify({ password: "[REDACTED]", name: "John Doe" }),
      );
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

    it("should apply action filter", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs("user-1", { action: "document_uploaded" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: "document_uploaded",
          }),
        }),
      );
    });

    it("should apply organizationId filter", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs("user-1", { organizationId: "org-1" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
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

    it("should apply only startDate when endDate is not provided", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      const startDate = new Date("2024-01-01");

      await getAuditLogs("user-1", { startDate });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
            },
          }),
        }),
      );
    });

    it("should use default limit and offset", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs("user-1");

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it("should apply action and organizationId together", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

      await getAuditLogs("user-1", {
        action: "document_uploaded",
        organizationId: "org-1",
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            action: "document_uploaded",
            organizationId: "org-1",
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

  describe("exportAuditLogs", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    const mockLogs = [
      {
        id: "log-1",
        userId: "user-1",
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-1",
        description: "Uploaded document",
        previousValue: null,
        newValue: null,
        timestamp: new Date("2024-06-15T10:00:00.000Z"),
        user: { name: "Test User" },
      },
      {
        id: "log-2",
        userId: "user-1",
        action: "article_status_changed",
        entityType: "article",
        entityId: "art-1",
        description: "Changed status",
        previousValue: JSON.stringify({ status: "draft" }),
        newValue: JSON.stringify({ status: "published" }),
        timestamp: new Date("2024-06-16T12:00:00.000Z"),
        user: { name: "Test User" },
      },
    ];

    it("should return raw logs in JSON format (default)", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as never);

      const result = await exportAuditLogs("user-1", startDate, endDate);

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: "asc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      });
    });

    it("should return raw logs when format is explicitly json", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as never);

      const result = await exportAuditLogs(
        "user-1",
        startDate,
        endDate,
        "json",
      );

      expect(result).toEqual(mockLogs);
    });

    it("should return CSV string when format is csv", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as never);

      const result = await exportAuditLogs("user-1", startDate, endDate, "csv");

      expect(typeof result).toBe("string");
      const csvStr = result as string;
      const lines = csvStr.split("\n");

      // Header line
      expect(lines[0]).toContain('"Timestamp"');
      expect(lines[0]).toContain('"User"');
      expect(lines[0]).toContain('"Action"');
      expect(lines[0]).toContain('"Entity Type"');
      expect(lines[0]).toContain('"Entity ID"');
      expect(lines[0]).toContain('"Description"');
      expect(lines[0]).toContain('"Previous Value"');
      expect(lines[0]).toContain('"New Value"');

      // Data lines
      expect(lines.length).toBe(3); // header + 2 rows
      expect(lines[1]).toContain('"Test User"');
      expect(lines[1]).toContain('"document_uploaded"');
    });

    it("should escape double quotes in CSV values", async () => {
      const logsWithQuotes = [
        {
          ...mockLogs[0],
          description: 'Uploaded "important" document',
        },
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(
        logsWithQuotes as never,
      );

      const result = (await exportAuditLogs(
        "user-1",
        startDate,
        endDate,
        "csv",
      )) as string;

      // Double quotes in values should be escaped as ""
      expect(result).toContain('""important""');
    });

    it("should show Unknown for user name when user is null", async () => {
      const logsNoUser = [
        {
          ...mockLogs[0],
          user: null,
        },
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(
        logsNoUser as never,
      );

      const result = (await exportAuditLogs(
        "user-1",
        startDate,
        endDate,
        "csv",
      )) as string;

      expect(result).toContain('"Unknown"');
    });

    it("should sanitize PII in CSV previousValue and newValue", async () => {
      const logsWithPII = [
        {
          ...mockLogs[0],
          previousValue: JSON.stringify({
            password: "secret123",
            name: "John",
          }),
          newValue: JSON.stringify({ token: "abc", email: "test@test.com" }),
        },
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(
        logsWithPII as never,
      );

      const result = (await exportAuditLogs(
        "user-1",
        startDate,
        endDate,
        "csv",
      )) as string;

      // The CSV should contain redacted PII
      expect(result).toContain("[REDACTED]");
      expect(result).not.toContain("secret123");
      expect(result).not.toContain('"abc"'); // token value should be redacted
    });

    it("should handle empty previousValue and newValue in CSV", async () => {
      const logsNoValues = [
        {
          ...mockLogs[0],
          previousValue: null,
          newValue: null,
        },
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(
        logsNoValues as never,
      );

      const result = (await exportAuditLogs(
        "user-1",
        startDate,
        endDate,
        "csv",
      )) as string;

      // Should have empty strings for null values
      const lines = result.split("\n");
      // The row should end with ,"","" for the null previousValue and newValue
      expect(lines[1]).toMatch(/,"",""\s*$/);
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

    it("should generate description for checklist item uncompleted", () => {
      const desc = generateAuditDescription(
        "checklist_item_uncompleted",
        "checklist",
      );

      expect(desc).toContain("not completed");
    });

    it("should generate description for document upload", () => {
      const desc = generateAuditDescription("document_uploaded", "document");

      expect(desc).toContain("Uploaded");
    });

    it("should generate description for document deleted", () => {
      const desc = generateAuditDescription("document_deleted", "document");

      expect(desc).toContain("Deleted");
    });

    it("should generate description for document status change", () => {
      const desc = generateAuditDescription(
        "document_status_changed",
        "document",
        { status: "pending" },
        { status: "approved" },
      );

      expect(desc).toContain("pending");
      expect(desc).toContain("approved");
    });

    it("should handle document status change with missing values", () => {
      const desc = generateAuditDescription(
        "document_status_changed",
        "document",
      );

      expect(desc).toContain("none");
      expect(desc).toContain("unknown");
    });

    it("should generate description for workflow creation", () => {
      const desc = generateAuditDescription("workflow_created", "workflow");

      expect(desc).toContain("Created authorization workflow");
    });

    it("should generate description for workflow status change", () => {
      const desc = generateAuditDescription(
        "workflow_status_changed",
        "workflow",
        { status: "draft" },
        { status: "submitted" },
      );

      expect(desc).toContain("draft");
      expect(desc).toContain("submitted");
    });

    it("should generate description for workflow submitted", () => {
      const desc = generateAuditDescription("workflow_submitted", "workflow");

      expect(desc).toContain("Submitted");
    });

    it("should generate description for user profile updated", () => {
      const desc = generateAuditDescription("user_profile_updated", "user");

      expect(desc).toContain("Updated user profile");
    });

    it("should generate description for assessment imported", () => {
      const desc = generateAuditDescription("assessment_imported", "document");

      expect(desc).toContain("Imported assessment");
    });

    it("should generate description for bulk status update", () => {
      const desc = generateAuditDescription("bulk_status_update", "document");

      expect(desc).toContain("document");
      expect(desc).toContain("statuses");
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

      it("should log HIGH severity events to console", async () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});
        vi.mocked(prisma.securityEvent.create).mockResolvedValue({
          id: "sec-1",
        } as never);

        await logSecurityEvent(
          "UNAUTHORIZED_ACCESS",
          "HIGH",
          "Unauthorized access attempt",
          { path: "/admin" },
        );

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it("should NOT log MEDIUM severity events to console.error", async () => {
        const consoleErrorSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});
        vi.mocked(prisma.securityEvent.create).mockResolvedValue({
          id: "sec-1",
        } as never);

        await logSecurityEvent(
          "RATE_LIMIT_EXCEEDED",
          "MEDIUM",
          "Rate limit exceeded",
        );

        // logger.security for MEDIUM uses console.warn, not console.error
        // So console.error should not be called (unless the main function calls it for other reasons)
        // Actually for MEDIUM, logSecurityEvent does not call logger.security at all
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });

      it("should handle error from prisma.securityEvent.create gracefully", async () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});
        vi.mocked(prisma.securityEvent.create).mockRejectedValue(
          new Error("DB connection failed"),
        );

        // Should not throw
        await expect(
          logSecurityEvent("SUSPICIOUS_ACTIVITY", "HIGH", "Test event"),
        ).resolves.not.toThrow();

        // logger.error is called in the catch block
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it("should stringify metadata when provided", async () => {
        vi.mocked(prisma.securityEvent.create).mockResolvedValue({
          id: "sec-1",
        } as never);

        await logSecurityEvent("SUSPICIOUS_ACTIVITY", "LOW", "Test event", {
          userId: "user-1",
          ip: "10.0.0.1",
        });

        expect(prisma.securityEvent.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            metadata: JSON.stringify({ userId: "user-1", ip: "10.0.0.1" }),
          }),
        });
      });

      it("should set metadata to null when not provided", async () => {
        vi.mocked(prisma.securityEvent.create).mockResolvedValue({
          id: "sec-1",
        } as never);

        await logSecurityEvent("SUSPICIOUS_ACTIVITY", "LOW", "Test event");

        expect(prisma.securityEvent.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            metadata: null,
          }),
        });
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

      it("should apply date range filter with startDate and endDate", async () => {
        vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([]);

        const startDate = new Date("2024-01-01");
        const endDate = new Date("2024-12-31");

        await getSecurityEvents({ startDate, endDate });

        expect(prisma.securityEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }),
          }),
        );
      });

      it("should apply only startDate filter", async () => {
        vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([]);

        const startDate = new Date("2024-06-01");

        await getSecurityEvents({ startDate });

        expect(prisma.securityEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdAt: {
                gte: startDate,
              },
            }),
          }),
        );
      });

      it("should apply only endDate filter", async () => {
        vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([]);

        const endDate = new Date("2024-12-31");

        await getSecurityEvents({ endDate });

        expect(prisma.securityEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdAt: {
                lte: endDate,
              },
            }),
          }),
        );
      });

      it("should use default limit of 100 and cap at 1000", async () => {
        vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([]);

        await getSecurityEvents();

        expect(prisma.securityEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          }),
        );
      });

      it("should cap limit at 1000", async () => {
        vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([]);

        await getSecurityEvents({ limit: 5000 });

        expect(prisma.securityEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 1000,
          }),
        );
      });

      it("should return empty where when no filters provided", async () => {
        vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([]);

        await getSecurityEvents();

        expect(prisma.securityEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
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

      it("should return zero counts when no events", async () => {
        vi.mocked(prisma.securityEvent.groupBy).mockResolvedValue([] as never);

        const counts = await getSecurityEventCounts();

        expect(counts.critical).toBe(0);
        expect(counts.high).toBe(0);
        expect(counts.medium).toBe(0);
        expect(counts.low).toBe(0);
        expect(counts.total).toBe(0);
      });

      it("should include LOW severity counts", async () => {
        vi.mocked(prisma.securityEvent.groupBy).mockResolvedValue([
          { severity: "LOW", _count: 7 },
        ] as never);

        const counts = await getSecurityEventCounts();

        expect(counts.low).toBe(7);
        expect(counts.total).toBe(7);
      });
    });
  });
});
