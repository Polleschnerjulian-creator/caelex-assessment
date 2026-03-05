import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    deadline: { findMany: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({
  sendDeadlineReminder: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("./index", () => ({
  getDaysBetween: vi.fn(),
  wasReminderSent: vi.fn(),
  startOfDay: vi.fn().mockImplementation((d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  }),
}));

import { prisma } from "@/lib/prisma";
import { sendDeadlineReminder } from "@/lib/email";
import { getDaysBetween, wasReminderSent } from "./index";
import {
  processDeadlineReminders,
  getUpcomingDeadlinesForUser,
  getOverdueDeadlinesForUser,
} from "./deadline-processor";

function makeDeadline(overrides: Record<string, unknown> = {}) {
  return {
    id: "dl-1",
    title: "Submit authorization report",
    dueDate: new Date("2026-04-15"),
    reminderDays: [30, 14, 7, 3, 1],
    remindersSent: [],
    status: "UPCOMING",
    priority: "HIGH",
    category: "AUTHORIZATION",
    regulatoryRef: "Art. 10",
    penaltyInfo: null,
    description: "Annual submission",
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

describe("deadline-processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processDeadlineReminders", () => {
    it("should process deadlines and send reminders when days match", async () => {
      const dl = makeDeadline();

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(14);
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockResolvedValue({
        success: true,
      } as never);

      const result = await processDeadlineReminders();

      expect(result.processed).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.deadlinesSent).toContain("dl-1");
      expect(sendDeadlineReminder).toHaveBeenCalledTimes(1);
      expect(prisma.deadline.update).toHaveBeenCalledWith({
        where: { id: "dl-1" },
        data: {
          remindersSent: { push: expect.any(Date) },
        },
      });
    });

    it("should skip deadlines when user has notifications disabled", async () => {
      const dl = makeDeadline({
        id: "dl-disabled",
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

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);

      const result = await processDeadlineReminders();

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
      expect(sendDeadlineReminder).not.toHaveBeenCalled();
    });

    it("should skip deadlines when notification method is portal", async () => {
      const dl = makeDeadline({
        id: "dl-portal",
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

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);

      const result = await processDeadlineReminders();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should skip deadlines when no recipient email available", async () => {
      const dl = makeDeadline({
        id: "dl-noemail",
        user: {
          id: "user-4",
          name: "No Email",
          email: null,
          supervisionConfig: {
            enableAutoReminders: true,
            notificationMethod: "email",
            designatedContactEmail: null,
          },
        },
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);

      const result = await processDeadlineReminders();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should skip when days until due does not match any reminder day", async () => {
      const dl = makeDeadline({ id: "dl-nomatch" });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(20); // not in [30, 14, 7, 3, 1]
      vi.mocked(wasReminderSent).mockReturnValue(false);

      const result = await processDeadlineReminders();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should skip when matching reminder was already sent for that threshold", async () => {
      const dl = makeDeadline({ id: "dl-already" });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(14);
      vi.mocked(wasReminderSent).mockReturnValue(true); // already sent

      const result = await processDeadlineReminders();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should send reminder for overdue deadline (negative days within -7)", async () => {
      const dl = makeDeadline({
        id: "dl-overdue",
        status: "OVERDUE",
        remindersSent: [],
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(-3); // overdue 3 days
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockResolvedValue({
        success: true,
      } as never);

      const result = await processDeadlineReminders();

      expect(result.sent).toBe(1);
      expect(sendDeadlineReminder).toHaveBeenCalledTimes(1);
      // daysRemaining should be 0 (Math.max(0, -3))
      expect(sendDeadlineReminder).toHaveBeenCalledWith(
        "test@example.com",
        "user-1",
        "dl-overdue",
        expect.objectContaining({
          daysRemaining: 0,
        }),
      );
    });

    it("should not send overdue reminder if reminder was already sent today", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dl = makeDeadline({
        id: "dl-overdue-sent",
        status: "OVERDUE",
        remindersSent: [today], // already sent today
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(-2);
      vi.mocked(wasReminderSent).mockReturnValue(false);

      const result = await processDeadlineReminders();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should skip overdue deadline beyond -7 days", async () => {
      const dl = makeDeadline({
        id: "dl-too-overdue",
        status: "OVERDUE",
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(-10); // too far overdue
      vi.mocked(wasReminderSent).mockReturnValue(false);

      const result = await processDeadlineReminders();

      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("should record error when email send fails", async () => {
      const dl = makeDeadline({ id: "dl-emailfail" });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(7);
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockResolvedValue({
        success: false,
        error: "SMTP timeout",
      } as never);

      const result = await processDeadlineReminders();

      expect(result.sent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("dl-emailfail");
      expect(result.errors[0]).toContain("SMTP timeout");
    });

    it("should handle global errors gracefully", async () => {
      vi.mocked(prisma.deadline.findMany).mockRejectedValue(
        new Error("DB failure"),
      );

      const result = await processDeadlineReminders();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Global error");
      expect(result.errors[0]).toContain("DB failure");
    });

    it("should handle per-deadline processing errors", async () => {
      const dl = makeDeadline({ id: "dl-throw" });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(7);
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockRejectedValue(
        new Error("Unexpected"),
      );

      const result = await processDeadlineReminders();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("dl-throw");
    });

    it("should use designatedContactEmail when available", async () => {
      const dl = makeDeadline({
        id: "dl-delegate",
        user: {
          id: "user-5",
          name: "Delegated User",
          email: "user@example.com",
          supervisionConfig: {
            enableAutoReminders: true,
            notificationMethod: "email",
            designatedContactEmail: "delegate@example.com",
          },
        },
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(3);
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockResolvedValue({
        success: true,
      } as never);

      await processDeadlineReminders();

      expect(sendDeadlineReminder).toHaveBeenCalledWith(
        "delegate@example.com",
        "user-5",
        "dl-delegate",
        expect.any(Object),
      );
    });

    it("should use user.email when no supervisionConfig exists", async () => {
      const dl = makeDeadline({
        id: "dl-noconfig",
        user: {
          id: "user-6",
          name: "No Config",
          email: "noconfig@example.com",
          supervisionConfig: null,
        },
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(1);
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockResolvedValue({
        success: true,
      } as never);

      await processDeadlineReminders();

      expect(sendDeadlineReminder).toHaveBeenCalledWith(
        "noconfig@example.com",
        "user-6",
        "dl-noconfig",
        expect.any(Object),
      );
    });

    it("should process multiple deadlines in one run", async () => {
      const dl1 = makeDeadline({
        id: "dl-multi-1",
        user: {
          id: "user-m1",
          name: "User M1",
          email: "m1@example.com",
          supervisionConfig: null,
        },
      });
      const dl2 = makeDeadline({
        id: "dl-multi-2",
        user: {
          id: "user-m2",
          name: "User M2",
          email: "m2@example.com",
          supervisionConfig: null,
        },
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([
        dl1,
        dl2,
      ] as never);
      vi.mocked(getDaysBetween).mockReturnValue(7);
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockResolvedValue({
        success: true,
      } as never);

      const result = await processDeadlineReminders();

      expect(result.processed).toBe(2);
      expect(result.sent).toBe(2);
      expect(sendDeadlineReminder).toHaveBeenCalledTimes(2);
    });

    it("should use default reminderDays when none are set on deadline", async () => {
      const dl = makeDeadline({
        id: "dl-default-days",
        reminderDays: null,
      });

      vi.mocked(prisma.deadline.findMany).mockResolvedValue([dl] as never);
      vi.mocked(getDaysBetween).mockReturnValue(30); // in default [30, 14, 7, 3, 1]
      vi.mocked(wasReminderSent).mockReturnValue(false);
      vi.mocked(sendDeadlineReminder).mockResolvedValue({
        success: true,
      } as never);

      const result = await processDeadlineReminders();

      expect(result.sent).toBe(1);
    });
  });

  describe("getUpcomingDeadlinesForUser", () => {
    it("should query upcoming deadlines within daysAhead", async () => {
      const mockDeadlines = [{ id: "dl-up-1" }];
      vi.mocked(prisma.deadline.findMany).mockResolvedValue(
        mockDeadlines as never,
      );

      const result = await getUpcomingDeadlinesForUser("user-1", 60);

      expect(result).toEqual(mockDeadlines);
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            status: { in: ["UPCOMING", "DUE_SOON"] },
          }),
          orderBy: { dueDate: "asc" },
        }),
      );
    });

    it("should use default 30 days when no daysAhead specified", async () => {
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);

      await getUpcomingDeadlinesForUser("user-1");

      expect(prisma.deadline.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOverdueDeadlinesForUser", () => {
    it("should query overdue deadlines for a user", async () => {
      const mockDeadlines = [{ id: "dl-overdue-1" }];
      vi.mocked(prisma.deadline.findMany).mockResolvedValue(
        mockDeadlines as never,
      );

      const result = await getOverdueDeadlinesForUser("user-1");

      expect(result).toEqual(mockDeadlines);
      expect(prisma.deadline.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          status: "OVERDUE",
        },
        orderBy: { dueDate: "asc" },
      });
    });
  });
});
