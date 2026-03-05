import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findMany: vi.fn(), update: vi.fn() },
    notificationLog: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({
  sendDocumentExpiryAlert: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("./index", () => ({
  getDaysBetween: vi.fn(),
  startOfDay: vi.fn().mockImplementation((d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  }),
}));

import { prisma } from "@/lib/prisma";
import { sendDocumentExpiryAlert } from "@/lib/email";
import { getDaysBetween } from "./index";
import {
  processDocumentExpiry,
  getExpiringDocumentsForUser,
  getExpiredDocumentsForUser,
} from "./document-processor";

function makeDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    name: "Test License",
    expiryDate: new Date("2026-04-01"),
    expiryAlertDays: [90, 30, 14, 7],
    isExpired: false,
    isLatest: true,
    status: "ACTIVE",
    category: "LICENSE",
    moduleType: "authorization",
    regulatoryRef: "Art. 5",
    userId: "user-1",
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      supervisionConfig: {
        enableAutoReminders: true,
        notificationMethod: "email",
        designatedContactEmail: null,
      },
    },
    ...overrides,
  };
}

describe("document-processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the sentAlerts set by reimporting would be complex,
    // so we work around it in tests
  });

  describe("processDocumentExpiry", () => {
    it("should process documents and send alerts when days match alert threshold", async () => {
      const doc = makeDocument();

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(30);
      vi.mocked(sendDocumentExpiryAlert).mockResolvedValue({
        success: true,
      } as never);

      const result = await processDocumentExpiry();

      expect(result.processed).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.documentsSent).toContain("doc-1");
      expect(sendDocumentExpiryAlert).toHaveBeenCalledTimes(1);
    });

    it("should skip documents when user has notifications disabled", async () => {
      const doc = makeDocument({
        id: "doc-disabled",
        user: {
          id: "user-2",
          name: "Disabled User",
          email: "disabled@example.com",
          supervisionConfig: {
            enableAutoReminders: false,
            notificationMethod: "email",
            designatedContactEmail: null,
          },
        },
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);

      const result = await processDocumentExpiry();

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
      expect(sendDocumentExpiryAlert).not.toHaveBeenCalled();
    });

    it("should skip documents when notification method is portal", async () => {
      const doc = makeDocument({
        id: "doc-portal",
        user: {
          id: "user-3",
          name: "Portal User",
          email: "portal@example.com",
          supervisionConfig: {
            enableAutoReminders: true,
            notificationMethod: "portal",
            designatedContactEmail: null,
          },
        },
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);

      const result = await processDocumentExpiry();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should skip documents when no recipient email is available", async () => {
      const doc = makeDocument({
        id: "doc-noemail",
        user: {
          id: "user-4",
          name: "No Email User",
          email: null,
          supervisionConfig: {
            enableAutoReminders: true,
            notificationMethod: "email",
            designatedContactEmail: null,
          },
        },
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);

      const result = await processDocumentExpiry();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should skip documents with no expiry date", async () => {
      const doc = makeDocument({
        id: "doc-noexpiry",
        expiryDate: null,
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);

      const result = await processDocumentExpiry();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should skip documents when days until expiry does not match alertDays and not expired", async () => {
      const doc = makeDocument({
        id: "doc-nomatch",
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(45); // not in [90, 30, 14, 7]

      const result = await processDocumentExpiry();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should send alert for expired document (negative days within -7)", async () => {
      const doc = makeDocument({
        id: "doc-expired-recent",
        isExpired: false,
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(-3); // Expired 3 days ago
      vi.mocked(sendDocumentExpiryAlert).mockResolvedValue({
        success: true,
      } as never);

      const result = await processDocumentExpiry();

      expect(result.sent).toBe(1);
      // Should mark as expired
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: "doc-expired-recent" },
        data: { isExpired: true, status: "EXPIRED" },
      });
    });

    it("should not mark already-expired documents as expired again", async () => {
      const doc = makeDocument({
        id: "doc-already-expired",
        isExpired: true,
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(-2);
      vi.mocked(sendDocumentExpiryAlert).mockResolvedValue({
        success: true,
      } as never);

      const result = await processDocumentExpiry();

      expect(result.sent).toBe(1);
      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it("should record error when email send fails", async () => {
      const doc = makeDocument({
        id: "doc-emailfail",
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(14);
      vi.mocked(sendDocumentExpiryAlert).mockResolvedValue({
        success: false,
        error: "SMTP connection failed",
      } as never);

      const result = await processDocumentExpiry();

      expect(result.sent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("doc-emailfail");
      expect(result.errors[0]).toContain("SMTP connection failed");
    });

    it("should skip already-alerted documents (sent today via notificationLog)", async () => {
      const doc = makeDocument({
        id: "doc-already-sent",
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      // Simulate that this document was already alerted today
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([
        { entityId: "doc-already-sent" },
      ] as never);
      vi.mocked(getDaysBetween).mockReturnValue(7);

      const result = await processDocumentExpiry();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should use designatedContactEmail when available", async () => {
      const doc = makeDocument({
        id: "doc-designated",
        user: {
          id: "user-5",
          name: "User with Delegate",
          email: "user@example.com",
          supervisionConfig: {
            enableAutoReminders: true,
            notificationMethod: "email",
            designatedContactEmail: "delegate@example.com",
          },
        },
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(7);
      vi.mocked(sendDocumentExpiryAlert).mockResolvedValue({
        success: true,
      } as never);

      await processDocumentExpiry();

      expect(sendDocumentExpiryAlert).toHaveBeenCalledWith(
        "delegate@example.com",
        "user-5",
        "doc-designated",
        expect.objectContaining({
          recipientName: "User with Delegate",
        }),
      );
    });

    it("should handle global errors gracefully", async () => {
      vi.mocked(prisma.document.findMany).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const result = await processDocumentExpiry();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Global error");
      expect(result.errors[0]).toContain("DB connection failed");
    });

    it("should handle per-document processing errors", async () => {
      const doc = makeDocument({ id: "doc-throw" });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(7);
      vi.mocked(sendDocumentExpiryAlert).mockRejectedValue(
        new Error("Unexpected error"),
      );

      const result = await processDocumentExpiry();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("doc-throw");
    });

    it("should use user.email when no supervisionConfig exists", async () => {
      const doc = makeDocument({
        id: "doc-noconfig",
        user: {
          id: "user-6",
          name: "Plain User",
          email: "plain@example.com",
          supervisionConfig: null,
        },
      });

      vi.mocked(prisma.document.findMany).mockResolvedValue([doc] as never);
      vi.mocked(prisma.notificationLog.findMany).mockResolvedValue([]);
      vi.mocked(getDaysBetween).mockReturnValue(90);
      vi.mocked(sendDocumentExpiryAlert).mockResolvedValue({
        success: true,
      } as never);

      await processDocumentExpiry();

      expect(sendDocumentExpiryAlert).toHaveBeenCalledWith(
        "plain@example.com",
        "user-6",
        "doc-noconfig",
        expect.any(Object),
      );
    });
  });

  describe("getExpiringDocumentsForUser", () => {
    it("should query documents expiring within daysAhead", async () => {
      const mockDocs = [{ id: "doc-exp-1" }];
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocs as never);

      const result = await getExpiringDocumentsForUser("user-1", 60);

      expect(result).toEqual(mockDocs);
      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            isLatest: true,
            status: {
              notIn: ["ARCHIVED", "SUPERSEDED", "REJECTED", "EXPIRED"],
            },
          }),
          orderBy: { expiryDate: "asc" },
        }),
      );
    });

    it("should use default 90 days when no daysAhead specified", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);

      await getExpiringDocumentsForUser("user-1");

      expect(prisma.document.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("getExpiredDocumentsForUser", () => {
    it("should query expired documents for a user", async () => {
      const mockDocs = [{ id: "doc-expired-1" }];
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocs as never);

      const result = await getExpiredDocumentsForUser("user-1");

      expect(result).toEqual(mockDocs);
      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            isLatest: true,
          }),
          orderBy: { expiryDate: "desc" },
        }),
      );
    });
  });
});
