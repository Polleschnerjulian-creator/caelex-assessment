/**
 * Churn Detection Cron Tests
 *
 * Tests: missing CRON_SECRET (503), unauthorized (401), happy path,
 * service error, no stack trace leakage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

const mockDetectAtRisk = vi.fn();
vi.mock("@/lib/services/churn-intervention-service", () => ({
  detectAtRiskOrganizations: (...args: unknown[]) => mockDetectAtRisk(...args),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

// ─── Helpers ───

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("https://app.caelex.com/api/cron/churn-detection", {
    headers,
  });
}

// ─── Tests ───

describe("GET /api/cron/churn-detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  describe("Authentication", () => {
    it("returns 503 when CRON_SECRET not configured", async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toContain("cron authentication not configured");
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
    it("returns results from detectAtRiskOrganizations", async () => {
      mockDetectAtRisk.mockResolvedValue({
        processed: 10,
        interventionsCreated: 3,
        emailsSent: 2,
        errors: [],
      });

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.processed).toBe(10);
      expect(body.interventionsCreated).toBe(3);
      expect(body.emailsSent).toBe(2);
      expect(body.errorCount).toBe(0);
    });

    it("limits errors in response to 10", async () => {
      const errors = Array.from({ length: 20 }, (_, i) => `error-${i}`);
      mockDetectAtRisk.mockResolvedValue({
        processed: 20,
        interventionsCreated: 0,
        emailsSent: 0,
        errors,
      });

      const res = await GET(makeRequest("Bearer test-secret"));
      const body = await res.json();
      expect(body.errors.length).toBe(10);
      expect(body.errorCount).toBe(20);
    });
  });

  describe("Error handling", () => {
    it("returns 500 on service error without leaking details", async () => {
      mockDetectAtRisk.mockRejectedValue(new Error("Database timeout"));

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Processing failed");
      expect(JSON.stringify(body)).not.toContain("Database timeout");
    });
  });
});
