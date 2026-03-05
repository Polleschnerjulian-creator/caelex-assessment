import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDaysBetween, isToday, startOfDay, wasReminderSent } from "./index";

// Mock the re-exported modules so the import doesn't fail
vi.mock("./deadline-processor", () => ({
  processDeadlineReminders: vi.fn(),
}));
vi.mock("./document-processor", () => ({
  processDocumentExpiry: vi.fn(),
}));

describe("notifications utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDaysBetween", () => {
    it("returns 0 for the same date", () => {
      const date = new Date("2025-06-15T12:00:00Z");
      expect(getDaysBetween(date, date)).toBe(0);
    });

    it("returns positive number when date1 is after date2", () => {
      const date1 = new Date("2025-06-17T12:00:00Z");
      const date2 = new Date("2025-06-15T12:00:00Z");
      expect(getDaysBetween(date1, date2)).toBe(2);
    });

    it("returns negative number when date1 is before date2", () => {
      const date1 = new Date("2025-06-13T12:00:00Z");
      const date2 = new Date("2025-06-15T12:00:00Z");
      expect(getDaysBetween(date1, date2)).toBe(-2);
    });

    it("uses Math.ceil for fractional days", () => {
      // 1.5 days difference -> Math.ceil(1.5) = 2
      const date1 = new Date("2025-06-16T12:00:00Z");
      const date2 = new Date("2025-06-15T00:00:00Z");
      expect(getDaysBetween(date1, date2)).toBe(2);
    });

    it("uses Math.ceil for negative fractional days", () => {
      // -1.5 days difference -> Math.ceil(-1.5) = -1
      const date1 = new Date("2025-06-13T12:00:00Z");
      const date2 = new Date("2025-06-15T00:00:00Z");
      expect(getDaysBetween(date1, date2)).toBe(-1);
    });

    it("handles large day differences", () => {
      const date1 = new Date("2026-06-15T00:00:00Z");
      const date2 = new Date("2025-06-15T00:00:00Z");
      expect(getDaysBetween(date1, date2)).toBe(365);
    });

    it("handles crossing midnight", () => {
      const date1 = new Date("2025-06-16T01:00:00Z");
      const date2 = new Date("2025-06-15T23:00:00Z");
      // 2 hours difference = 2/24 = 0.083... days -> Math.ceil = 1
      expect(getDaysBetween(date1, date2)).toBe(1);
    });
  });

  describe("isToday", () => {
    it("returns true for today's date", () => {
      const now = new Date();
      expect(isToday(now)).toBe(true);
    });

    it("returns true for today at midnight", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(isToday(today)).toBe(true);
    });

    it("returns true for today at end of day", () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      expect(isToday(today)).toBe(true);
    });

    it("returns false for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it("returns false for tomorrow", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });

    it("returns false for a date in a different year", () => {
      const pastDate = new Date("2020-01-01T12:00:00Z");
      expect(isToday(pastDate)).toBe(false);
    });
  });

  describe("startOfDay", () => {
    it("sets hours, minutes, seconds, milliseconds to 0", () => {
      const date = new Date("2025-06-15T14:35:22.123Z");
      const result = startOfDay(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("does not mutate the original date", () => {
      const date = new Date("2025-06-15T14:35:22.123Z");
      const originalTime = date.getTime();
      startOfDay(date);
      expect(date.getTime()).toBe(originalTime);
    });

    it("preserves the date portion", () => {
      const date = new Date("2025-06-15T14:35:22.123Z");
      const result = startOfDay(date);
      expect(result.getFullYear()).toBe(date.getFullYear());
      expect(result.getMonth()).toBe(date.getMonth());
      expect(result.getDate()).toBe(date.getDate());
    });

    it("returns the same result for a date already at start of day", () => {
      const date = new Date("2025-06-15T00:00:00.000");
      const result = startOfDay(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe("wasReminderSent", () => {
    it("returns false for empty remindersSent array", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      expect(wasReminderSent([], dueDate, 7)).toBe(false);
    });

    it("returns true when a reminder was sent on the target date", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      // 7 days before June 20 = June 13
      const sentDate = new Date("2025-06-13T10:00:00Z");
      expect(wasReminderSent([sentDate], dueDate, 7)).toBe(true);
    });

    it("returns false when no reminder was sent on the target date", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      // Sent on June 12 but target is June 13
      const sentDate = new Date("2025-06-12T10:00:00Z");
      expect(wasReminderSent([sentDate], dueDate, 7)).toBe(false);
    });

    it("returns true when one of multiple reminders matches", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      const reminders = [
        new Date("2025-06-10T08:00:00Z"),
        new Date("2025-06-13T15:00:00Z"), // This matches reminderDay=7
        new Date("2025-06-18T09:00:00Z"),
      ];
      expect(wasReminderSent(reminders, dueDate, 7)).toBe(true);
    });

    it("matches regardless of time within the day", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      // Sent at different time on June 13
      const sentDate = new Date("2025-06-13T23:59:59.999");
      expect(wasReminderSent([sentDate], dueDate, 7)).toBe(true);
    });

    it("handles reminderDay of 0 (due date itself)", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      const sentDate = new Date("2025-06-20T08:00:00Z");
      expect(wasReminderSent([sentDate], dueDate, 0)).toBe(true);
    });

    it("handles reminderDay of 1", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      const sentDate = new Date("2025-06-19T08:00:00Z");
      expect(wasReminderSent([sentDate], dueDate, 1)).toBe(true);
    });

    it("returns false when reminder dates don't match any threshold", () => {
      const dueDate = new Date("2025-06-20T12:00:00Z");
      const reminders = [
        new Date("2025-06-01T08:00:00Z"),
        new Date("2025-06-05T08:00:00Z"),
      ];
      expect(wasReminderSent(reminders, dueDate, 7)).toBe(false);
    });
  });
});
