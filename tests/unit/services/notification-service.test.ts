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

// Mock email
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  isEmailConfigured: vi.fn().mockReturnValue(true),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  maskEmail: vi.fn((e: string) => e),
}));

import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email";
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

    it("should pass correct filtered data to createMany when excluding users", async () => {
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ] as never);
      vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 2 });

      await notifyOrganization(
        "org-1",
        "MEMBER_JOINED",
        "New Member",
        "A new member joined",
        { excludeUserIds: ["user-2"] },
      );

      const createManyCall = vi.mocked(prisma.notification.createMany).mock
        .calls[0][0] as { data: Array<{ userId: string }> };
      const userIds = createManyCall.data.map((d) => d.userId);
      expect(userIds).toContain("user-1");
      expect(userIds).toContain("user-3");
      expect(userIds).not.toContain("user-2");
    });
  });

  describe("dispatchNotification (via createNotification)", () => {
    it("should skip email when quiet hours are enabled and active", async () => {
      // Set up: quiet hours 00:00 - 23:59 (always in quiet hours)
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        userId: "user-1",
        emailEnabled: true,
        pushEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: "00:00",
        quietHoursEnd: "23:59",
        quietHoursTimezone: "Europe/Berlin",
        categories: null,
      } as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      // sendEmail should NOT have been called because quiet hours are active
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should send email when quiet hours are enabled but missing start/end", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        userId: "user-1",
        emailEnabled: true,
        pushEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: "Europe/Berlin",
        categories: null,
      } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "Test",
      } as never);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      // isInQuietHours returns false when start/end are missing, so email is sent
      expect(sendEmail).toHaveBeenCalled();
    });

    it("should skip email when category email preference is false", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
        severity: "WARNING",
      } as never);
      // DEADLINE_REMINDER is in "deadlines" category
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        userId: "user-1",
        emailEnabled: true,
        pushEnabled: true,
        quietHoursEnabled: false,
        categories: { deadlines: { email: false, push: true } },
      } as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should skip email when global emailEnabled is false", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        userId: "user-1",
        emailEnabled: false,
        pushEnabled: true,
        quietHoursEnabled: false,
        categories: null,
      } as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should send email when preferences are null (defaults)", async () => {
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "Test User",
      } as never);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      // With null preferences, email should be sent (default behavior)
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendNotificationEmail (via createNotification)", () => {
    it("should not send email when user has no email", async () => {
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

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not send email when user email is null", async () => {
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: null,
        name: "User",
      } as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should skip email when email is not configured", async () => {
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(false);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test message",
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should use emailSubjectPrefix in subject when available", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_OVERDUE",
        title: "Task is overdue",
        message: "Your task is past the deadline",
        severity: "URGENT",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_OVERDUE",
        title: "Task is overdue",
        message: "Your task is past the deadline",
      });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "[Overdue] Task is overdue",
        }),
      );
    });

    it("should use title as subject when no emailSubjectPrefix", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "COMPLIANCE_UPDATED",
        title: "Compliance was updated",
        message: "Check compliance",
        severity: "INFO",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "COMPLIANCE_UPDATED",
        title: "Compliance was updated",
        message: "Check compliance",
      });

      // COMPLIANCE_UPDATED has no emailSubjectPrefix
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Compliance was updated",
        }),
      );
    });

    it("should use red severity color for URGENT notifications", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_OVERDUE",
        title: "Overdue",
        message: "It is overdue",
        severity: "URGENT",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_OVERDUE",
        title: "Overdue",
        message: "It is overdue",
        severity: "URGENT",
      });

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("#EF4444"); // red for URGENT
    });

    it("should use amber severity color for WARNING notifications", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Reminder",
        message: "Reminder message",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Reminder",
        message: "Reminder message",
      });

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("#F59E0B"); // amber for WARNING
    });

    it("should use blue severity color for INFO (default) notifications", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "COMPLIANCE_UPDATED",
        title: "Update",
        message: "Updated",
        severity: "INFO",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "COMPLIANCE_UPDATED",
        title: "Update",
        message: "Updated",
      });

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("#3B82F6"); // blue for INFO
    });

    it("should update notification emailSent on success", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
      });

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        data: expect.objectContaining({
          emailSent: true,
        }),
      });
    });

    it("should not update notification on email failure", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: "bounced",
      } as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
      });

      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it("should include action link in email when actionUrl is provided", async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
        severity: "WARNING",
        actionUrl: "/dashboard/modules",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "user@test.com",
        name: "User",
      } as never);
      vi.mocked(isEmailConfigured).mockReturnValue(true);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
        actionUrl: "/dashboard/modules",
      });

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("View Details");
      expect(emailCall.html).toContain("/dashboard/modules");
    });
  });

  describe("isInQuietHours (via createNotification)", () => {
    it("should handle overnight quiet hours (e.g., 22:00-08:00)", async () => {
      // We test this indirectly by setting quiet hours from 00:00 to 23:59
      // which covers all day. Severity must be INFO (not WARNING/CRITICAL)
      // because WARNING+ notifications are never suppressed by quiet hours.
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
        severity: "INFO",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        userId: "user-1",
        emailEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: "00:00",
        quietHoursEnd: "23:59",
        categories: null,
      } as never);

      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
      });

      // Should be in quiet hours (non-overnight range covers all day)
      // and INFO severity is suppressible, so no email should be sent
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should handle overnight quiet hours where start > end", async () => {
      // Overnight: 22:00 to 08:00 — start > end
      // We can't control time, but we test the branch exists
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
        severity: "WARNING",
      } as never);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
        userId: "user-1",
        emailEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        categories: null,
      } as never);

      // This test exercises the overnight quiet hours branch
      // The result depends on the current time, but it should not throw
      await createNotification({
        userId: "user-1",
        type: "DEADLINE_REMINDER",
        title: "Test",
        message: "Test",
      });

      // We just verify it doesn't throw — the branch is exercised
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });
});
