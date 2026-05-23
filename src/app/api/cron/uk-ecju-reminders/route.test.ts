/**
 * UK ECJU Reminders Cron tests (Z37-UK, Tier 4).
 *
 * Tests: missing CRON_SECRET (500), unauthorized (401), happy path,
 * service error response shape, no stack trace leakage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRunUkEcjuExpiryAndReminders } = vi.hoisted(() => ({
  mockRunUkEcjuExpiryAndReminders: vi.fn(),
}));

vi.mock("@/lib/trade/uk-ecju/uk-ecju-reminder-service", () => ({
  runUkEcjuExpiryAndReminders: mockRunUkEcjuExpiryAndReminders,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("https://app.caelex.com/api/cron/uk-ecju-reminders", {
    headers,
  });
}

describe("GET /api/cron/uk-ecju-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret-32-chars-or-more-12345";
  });

  it("returns 500 when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer x"));
    expect(res.status).toBe(500);
  });

  it("returns 401 without authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 200 + summary on happy path", async () => {
    mockRunUkEcjuExpiryAndReminders.mockResolvedValue({
      scanned: 5,
      expired: 1,
      emittedNotifications: 3,
      emittedEmails: 1,
      perLicense: [],
      totalElapsedMs: 42,
    });
    const res = await GET(
      makeRequest("Bearer test-secret-32-chars-or-more-12345"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scanned).toBe(5);
    expect(body.expired).toBe(1);
    expect(body.emittedNotifications).toBe(3);
    expect(body.emittedEmails).toBe(1);
  });

  it("returns 500 on service error without leaking stack", async () => {
    mockRunUkEcjuExpiryAndReminders.mockRejectedValue(
      new Error("Database connection refused"),
    );
    const res = await GET(
      makeRequest("Bearer test-secret-32-chars-or-more-12345"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal error");
    expect(body.stack).toBeUndefined();
  });
});
