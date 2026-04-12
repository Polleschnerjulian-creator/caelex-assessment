import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

// ─── Mock rate limiter ───
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 4,
    reset: Date.now() + 60000,
    limit: 5,
  }),
  getIdentifier: vi.fn().mockReturnValue("127.0.0.1"),
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
    }),
  ),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
}));

// ─── Mock Logger ───
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  maskEmail: (email: string) => email.replace(/(.{2}).*(@.*)/, "$1***$2"),
}));

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactRequest: {
      create: vi.fn().mockResolvedValue({ id: "cr-1" }),
    },
  },
}));

// ─── Mock CRM auto-link (fire-and-forget in the route) ───
vi.mock("@/lib/crm/auto-link.server", () => ({
  linkInboundLead: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock validations ───
vi.mock("@/lib/validations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validations")>();
  return {
    ...actual,
    getSafeErrorMessage: (err: unknown) =>
      err instanceof Error ? err.message : "Unknown error",
  };
});

// ─── Mock Resend ───
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: (...args: unknown[]) => mockSend(...args),
    };
  },
}));

import { POST } from "@/app/api/contact/route";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";

// ─── Helpers ───

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validContactData = {
  name: "Jane Doe",
  email: "jane@example.com",
  company: "Space Corp",
  message: "I would like to learn more about your compliance platform.",
};

// ─── Tests ───

describe("POST /api/contact", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limit mock to default success state after each test
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60000,
      limit: 5,
    } as never);
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: "re_test_key_123",
    };
    mockSend.mockResolvedValue({ id: "email-123" });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── Success ───

  it("should send contact form successfully with valid data", async () => {
    const request = makeRequest(validContactData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("should send email with correct recipient and subject", async () => {
    const request = makeRequest(validContactData);
    await POST(request);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cs@caelex.eu",
        replyTo: "jane@example.com",
        subject: expect.stringContaining("Jane Doe"),
      }),
    );
  });

  it("should include company name in subject when provided", async () => {
    const request = makeRequest(validContactData);
    await POST(request);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Space Corp"),
      }),
    );
  });

  it("should succeed without optional company field", async () => {
    const { company, ...dataWithoutCompany } = validContactData;
    const request = makeRequest(dataWithoutCompany);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  // ─── Missing Fields ───

  it("should return 400 when name is missing", async () => {
    const { name, ...data } = validContactData;
    const request = makeRequest(data);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe("Invalid input");
    expect(responseData.details).toBeDefined();
  });

  it("should return 400 when email is missing", async () => {
    const { email, ...data } = validContactData;
    const request = makeRequest(data);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe("Invalid input");
    expect(responseData.details).toBeDefined();
  });

  it("should return 400 when message is missing", async () => {
    const { message, ...data } = validContactData;
    const request = makeRequest(data);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe("Invalid input");
    expect(responseData.details).toBeDefined();
  });

  // ─── Email Validation ───

  it("should return 400 for invalid email format", async () => {
    const request = makeRequest({
      ...validContactData,
      email: "not-an-email",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 400 for email without domain", async () => {
    const request = makeRequest({
      ...validContactData,
      email: "user@",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  // ─── Input Length Validation ───

  it("should return 400 when name exceeds 200 characters", async () => {
    const request = makeRequest({
      ...validContactData,
      name: "A".repeat(201),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 400 when message exceeds 5000 characters", async () => {
    const request = makeRequest({
      ...validContactData,
      message: "M".repeat(5001),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  it("should return 400 when company exceeds 200 characters", async () => {
    const request = makeRequest({
      ...validContactData,
      company: "C".repeat(201),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
    expect(data.details).toBeDefined();
  });

  // ─── Honeypot ───

  it("should silently succeed when honeypot field is filled (bot trap)", async () => {
    const request = makeRequest({
      ...validContactData,
      _hp: "bot-filled-this",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Should NOT send any email
    expect(mockSend).not.toHaveBeenCalled();
  });

  // ─── Rate Limiting ───

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
    } as any);

    const request = makeRequest(validContactData);
    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(createRateLimitResponse).toHaveBeenCalled();
  });

  // ─── Missing Resend API Key ───

  it("should still succeed when RESEND_API_KEY is not configured (record saved, email skipped)", async () => {
    // The route saves the contact request to DB first, then attempts
    // to send the notification email. When RESEND_API_KEY is missing
    // it logs a warning but returns 200 — the customer's request was
    // still captured, just no notification was sent.
    delete process.env.RESEND_API_KEY;

    const request = makeRequest(validContactData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  // ─── Resend Error ───

  it("should still succeed when email service fails (record saved, email error is non-blocking)", async () => {
    // The route saves the contact request to DB first, then attempts
    // the notification email inside a try/catch. If Resend fails, the
    // request was still captured — the route logs the error and
    // returns 200 { success: true }.
    mockSend.mockRejectedValue(new Error("Resend API error"));

    const request = makeRequest(validContactData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
