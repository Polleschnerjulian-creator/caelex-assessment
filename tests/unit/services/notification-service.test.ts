import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_CONFIG,
  NOTIFICATION_CATEGORIES,
  createNotification,
  createBulkNotifications,
  getNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAllNotifications,
  deleteOldNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  notifyUser,
  notifyOrganization,
} from "@/lib/services/notification-service";

describe("Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("NOTIFICATION_CONFIG", () => {
    it("should have config for all notification types", () => {
      const types = [
        "DEADLINE_REMINDER",
        "DEADLINE_APPROACHING",
        "DEADLINE_OVERDUE",
        "DOCUMENT_EXPIRY",
        "COMPLIANCE_GAP",
        "COMPLIANCE_SCORE_DROPPED",
        "COMPLIANCE_ACTION_REQUIRED",
        "COMPLIANCE_UPDATED",
        "AUTHORIZATION_UPDATE",
        "WORKFLOW_STATUS_CHANGED",
        "DOCUMENT_REQUIRED",
        "AUTHORIZATION_APPROVED",
        "AUTHORIZATION_REJECTED",
        "INCIDENT_ALERT",
        "INCIDENT_CREATED",
        "INCIDENT_ESCALATED",
        "INCIDENT_RESOLVED",
        "NCA_DEADLINE_APPROACHING",
        "WEEKLY_DIGEST",
        "REPORT_GENERATED",
        "REPORT_SUBMITTED",
        "REPORT_FAILED",
        "NCA_ACKNOWLEDGED",
        "MEMBER_JOINED",
        "MEMBER_LEFT",
        "MEMBER_ROLE_CHANGED",
        "INVITATION_RECEIVED",
        "SPACECRAFT_STATUS_CHANGED",
        "SPACECRAFT_ADDED",
        "SYSTEM_UPDATE",
        "SYSTEM_MAINTENANCE",
      ];

      for (const type of types) {
        expect(
          NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG],
        ).toBeDefined();
        expect(
          NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG].label,
        ).toBeDefined();
        expect(
          NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]
            .category,
        ).toBeDefined();
        expect(
          NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]
            .defaultSeverity,
        ).toBeDefined();
      }
    });

    it("should have correct severities for critical notifications", () => {
      expect(NOTIFICATION_CONFIG.INCIDENT_ESCALATED.defaultSeverity).toBe(
        "CRITICAL",
      );
      expect(NOTIFICATION_CONFIG.DEADLINE_OVERDUE.defaultSeverity).toBe(
        "URGENT",
      );
      expect(NOTIFICATION_CONFIG.AUTHORIZATION_REJECTED.defaultSeverity).toBe(
        "URGENT",
      );
    });

    it("should have email subject prefixes for important notifications", () => {
      expect(NOTIFICATION_CONFIG.DEADLINE_OVERDUE.emailSubjectPrefix).toBe(
        "[Overdue]",
      );
      expect(NOTIFICATION_CONFIG.INCIDENT_ESCALATED.emailSubjectPrefix).toBe(
        "[URGENT]",
      );
      expect(
        NOTIFICATION_CONFIG.AUTHORIZATION_APPROVED.emailSubjectPrefix,
      ).toBe("[Approved]");
    });
  });

  describe("NOTIFICATION_CATEGORIES", () => {
    it("should have all required categories", () => {
      const categoryIds = NOTIFICATION_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toContain("deadlines");
      expect(categoryIds).toContain("compliance");
      expect(categoryIds).toContain("authorization");
      expect(categoryIds).toContain("incidents");
      expect(categoryIds).toContain("reports");
      expect(categoryIds).toContain("team");
      expect(categoryIds).toContain("spacecraft");
      expect(categoryIds).toContain("system");
    });

    it("should have labels for all categories", () => {
      for (const category of NOTIFICATION_CATEGORIES) {
        expect(category.label).toBeDefined();
        expect(typeof category.label).toBe("string");
      }
    });
  });

  describe("createNotification", () => {
    it("should create notification with default severity", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      const notification = await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          type: "DEADLINE_REMINDER",
          title: "Test",
          message: "Test message",
          severity: "WARNING", // Default from config
        }),
      });
    });

    it("should create notification with custom severity", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        severity: "CRITICAL",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
        severity: "CRITICAL",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: "CRITICAL",
        }),
      });
    });
  });

  describe("createBulkNotifications", () => {
    it("should create multiple notifications", async () => {
      vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 2 });

      const count = await createBulkNotifications([
        {
          userId: "user-1",
          type: "DEADLINE_REMINDER",
          title: "Test 1",
          message: "Message 1",
        },
        {
          userId: "user-2",
          type: "DEADLINE_REMINDER",
          title: "Test 2",
          message: "Message 2",
        },
      ]);

      expect(count).toBe(2);
      expect(prisma.notification.createMany).toHaveBeenCalled();
    });
  });

  describe("getNotification", () => {
    it("should get notification by id and userId", async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
      } as never);

      const notification = await getNotification("notif-1", "user-1");

      expect(notification).toBeDefined();
      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-1" },
      });
    });

    it("should return null for non-existent notification", async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

      const notification = await getNotification("notif-1", "user-1");

      expect(notification).toBeNull();
    });
  });

  describe("getUserNotifications", () => {
    it("should return notifications with pagination", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([
        { id: "notif-1" },
        { id: "notif-2" },
      ] as never);
      vi.mocked(prisma.notification.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unreadCount

      const result = await getUserNotifications(
        "user-1",
        {},
        { limit: 20, offset: 0 },
      );

      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.unreadCount).toBe(3);
    });

    it("should apply read filter", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(0);

      await getUserNotifications("user-1", { read: false });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        }),
      );
    });

    it("should apply type filter", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(0);

      await getUserNotifications("user-1", { type: "DEADLINE_REMINDER" });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "DEADLINE_REMINDER" }),
        }),
      );
    });

    it("should apply date range filter", async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(0);

      const fromDate = new Date("2024-01-01");
      const toDate = new Date("2024-12-31");

      await getUserNotifications("user-1", { fromDate, toDate });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: fromDate, lte: toDate },
          }),
        }),
      );
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread count", async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(5);

      const count = await getUnreadCount("user-1");

      expect(count).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false, dismissed: false },
      });
    });
  });

  describe("markAsRead", () => {
    it("should mark multiple notifications as read", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 });

      const count = await markAsRead("user-1", [
        "notif-1",
        "notif-2",
        "notif-3",
      ]);

      expect(count).toBe(3);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["notif-1", "notif-2", "notif-3"] },
          userId: "user-1",
        },
        data: expect.objectContaining({
          read: true,
        }),
      });
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({
        count: 10,
      });

      const count = await markAllAsRead("user-1");

      expect(count).toBe(10);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false },
        data: expect.objectContaining({
          read: true,
        }),
      });
    });
  });

  describe("dismissNotification", () => {
    it("should dismiss notification", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });

      await dismissNotification("user-1", "notif-1");

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-1" },
        data: { dismissed: true },
      });
    });
  });

  describe("dismissAllNotifications", () => {
    it("should dismiss all notifications", async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });

      const count = await dismissAllNotifications("user-1");

      expect(count).toBe(5);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", dismissed: false },
        data: { dismissed: true },
      });
    });
  });

  describe("deleteOldNotifications", () => {
    it("should delete old dismissed notifications", async () => {
      vi.mocked(prisma.notification.deleteMany).mockResolvedValue({
        count: 100,
      });

      const count = await deleteOldNotifications(90);

      expect(count).toBe(100);
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          dismissed: true,
        }),
      });
    });

    it("should use default 90 days if not specified", async () => {
      vi.mocked(prisma.notification.deleteMany).mockResolvedValue({
        count: 50,
      });

      await deleteOldNotifications();

      expect(prisma.notification.deleteMany).toHaveBeenCalled();
    });
  });

  describe("getNotificationPreferences", () => {
    it("should return preferences for user", async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        userId: "user-1",
        emailEnabled: true,
        pushEnabled: true,
      } as never);

      const prefs = await getNotificationPreferences("user-1");

      expect(prefs).toBeDefined();
      expect(prefs?.emailEnabled).toBe(true);
    });

    it("should return null if no preferences set", async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );

      const prefs = await getNotificationPreferences("user-1");

      expect(prefs).toBeNull();
    });
  });

  describe("updateNotificationPreferences", () => {
    it("should update preferences", async () => {
      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue({
        userId: "user-1",
        emailEnabled: false,
        pushEnabled: true,
      } as never);

      const prefs = await updateNotificationPreferences("user-1", {
        emailEnabled: false,
      });

      expect(prefs.emailEnabled).toBe(false);
      expect(prisma.notificationPreference.upsert).toHaveBeenCalled();
    });

    it("should update quiet hours settings", async () => {
      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue({
        userId: "user-1",
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      } as never);

      await updateNotificationPreferences("user-1", {
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            quietHoursEnabled: true,
            quietHoursStart: "22:00",
            quietHoursEnd: "08:00",
          }),
        }),
      );
    });

    it("should update digest settings", async () => {
      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue({
        userId: "user-1",
        digestEnabled: true,
        digestFrequency: "daily",
      } as never);

      await updateNotificationPreferences("user-1", {
        digestEnabled: true,
        digestFrequency: "daily",
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalled();
    });
  });

  describe("notifyUser", () => {
    it("should create notification for user", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await notifyUser(
        "user-1",
        "DEADLINE_REMINDER",
        "Test Title",
        "Test Message",
        { actionUrl: "/dashboard" },
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          type: "DEADLINE_REMINDER",
          title: "Test Title",
          message: "Test Message",
          actionUrl: "/dashboard",
        }),
      });
    });
  });

  describe("notifyOrganization", () => {
    it("should create notifications for all org members", async () => {
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ] as never);
      vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 3 });

      const count = await notifyOrganization(
        "org-1",
        "MEMBER_JOINED",
        "New Member",
        "A new member joined",
      );

      expect(count).toBe(3);
      expect(prisma.notification.createMany).toHaveBeenCalled();
    });

    it("should exclude specified users", async () => {
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ] as never);
      vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 2 });

      const count = await notifyOrganization(
        "org-1",
        "MEMBER_JOINED",
        "New Member",
        "A new member joined",
        { excludeUserIds: ["user-1"] },
      );

      expect(count).toBe(2);
    });

    it("should return 0 if no members to notify", async () => {
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);

      const count = await notifyOrganization(
        "org-1",
        "MEMBER_JOINED",
        "New Member",
        "A new member joined",
      );

      expect(count).toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
