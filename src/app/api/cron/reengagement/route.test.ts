/**
 * Re-Engagement Emails Cron Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockProcessReengagement = vi.fn();
vi.mock("@/lib/services/reengagement-service", () => ({
  processReengagementEmails: (...args: unknown[]) =>
    mockProcessReengagement(...args),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_: unknown, fb: string) => fb),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST } from "./route";

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/reengagement", {
    headers: h,
  });
}

describe("GET /api/cron/reengagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessReengagement.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 503 when CRON_SECRET not configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(makeRequest("Bearer test-secret"))).status).toBe(503);
  });

  it("returns 401 without auth", async () => {
    expect((await GET(makeRequest())).status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    expect((await GET(makeRequest("Bearer wrong"))).status).toBe(401);
  });

  it("returns re-engagement processing results", async () => {
    mockProcessReengagement.mockResolvedValue({
      processed: 20,
      sent: 15,
      skipped: 5,
      errors: [],
    });
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(20);
    expect(body.sent).toBe(15);
  });

  it("POST delegates to GET", async () => {
    mockProcessReengagement.mockResolvedValue({
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [],
    });
    expect((await POST(makeRequest("Bearer test-secret"))).status).toBe(200);
  });

  it("returns 500 on error without leaking details", async () => {
    mockProcessReengagement.mockRejectedValue(new Error("Redis timeout"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("Redis");
  });
});
