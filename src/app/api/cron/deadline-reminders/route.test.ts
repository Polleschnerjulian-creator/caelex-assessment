/**
 * Deadline Reminders Cron Tests
 *
 * Tests: missing CRON_SECRET (503), unauthorized (401), happy path,
 * POST delegates to GET, service error, no stack trace leakage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

const mockProcessDeadlineReminders = vi.fn();
vi.mock("@/lib/notifications", () => ({
  processDeadlineReminders: (...args: unknown[]) =>
    mockProcessDeadlineReminders(...args),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST } from "./route";

// ─── Helpers ───

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("https://app.caelex.com/api/cron/deadline-reminders", {
    headers,
  });
}

// ─── Tests ───

describe("GET /api/cron/deadline-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  describe("Authentication", () => {
    it("returns 503 when CRON_SECRET not configured", async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(503);
    });

    it("returns 401 without authorization", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("returns 401 with wrong secret", async () => {
      const res = await GET(makeRequest("Bearer wrong"));
      expect(res.status).toBe(401);
    });
  });

  describe("Happy path", () => {
    it("returns reminder processing results", async () => {
      mockProcessDeadlineReminders.mockResolvedValue({
        processed: 15,
        sent: 8,
        skipped: 7,
        errors: [],
        deadlinesSent: [{ id: "d1", title: "Authorization renewal" }],
      });

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.processed).toBe(15);
      expect(body.sent).toBe(8);
      expect(body.skipped).toBe(7);
      expect(body.errorCount).toBe(0);
      expect(body.deadlinesSent).toHaveLength(1);
    });

    it("limits errors to 10 in response", async () => {
      const errors = Array.from({ length: 25 }, (_, i) => `err-${i}`);
      mockProcessDeadlineReminders.mockResolvedValue({
        processed: 25,
        sent: 0,
        skipped: 0,
        errors,
        deadlinesSent: [],
      });

      const res = await GET(makeRequest("Bearer test-secret"));
      const body = await res.json();
      expect(body.errors).toHaveLength(10);
      expect(body.errorCount).toBe(25);
    });
  });

  describe("POST delegates to GET", () => {
    it("POST returns same result", async () => {
      mockProcessDeadlineReminders.mockResolvedValue({
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: [],
        deadlinesSent: [],
      });

      const res = await POST(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
    });
  });

  describe("Error handling", () => {
    it("returns 500 on service error without leaking details", async () => {
      mockProcessDeadlineReminders.mockRejectedValue(
        new Error("SMTP connection failed"),
      );

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(JSON.stringify(body)).not.toContain("SMTP");
    });
  });
});
