/**
 * Document Expiry Cron Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockProcessDocumentExpiry = vi.fn();
vi.mock("@/lib/notifications", () => ({
  processDocumentExpiry: (...args: unknown[]) =>
    mockProcessDocumentExpiry(...args),
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
  return new Request("https://app.caelex.com/api/cron/document-expiry", {
    headers: h,
  });
}

describe("GET /api/cron/document-expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessDocumentExpiry.mockReset();
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

  it("returns document expiry processing results", async () => {
    mockProcessDocumentExpiry.mockResolvedValue({
      processed: 10,
      sent: 5,
      skipped: 5,
      errors: [],
      documentsSent: [{ id: "d1" }],
    });
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(10);
    expect(body.sent).toBe(5);
    expect(body.documentsSent).toHaveLength(1);
  });

  it("POST delegates to GET", async () => {
    mockProcessDocumentExpiry.mockResolvedValue({
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [],
      documentsSent: [],
    });
    expect((await POST(makeRequest("Bearer test-secret"))).status).toBe(200);
  });

  it("returns 500 on error without leaking details", async () => {
    mockProcessDocumentExpiry.mockRejectedValue(new Error("S3 timeout"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("S3 timeout");
  });
});
