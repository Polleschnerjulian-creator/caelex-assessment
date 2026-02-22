import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock rate limiter ───
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 4 }),
  getIdentifier: vi.fn().mockReturnValue("127.0.0.1"),
  createRateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
    }),
  ),
}));

// ─── Mock Resend ───
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: (...args: unknown[]) => mockSend(...args),
    },
  })),
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
    expect(responseData.error).toBe("Missing required fields");
  });

  it("should return 400 when email is missing", async () => {
    const { email, ...data } = validContactData;
    const request = makeRequest(data);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe("Missing required fields");
  });

  it("should return 400 when message is missing", async () => {
    const { message, ...data } = validContactData;
    const request = makeRequest(data);
    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe("Missing required fields");
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
    expect(data.error).toBe("Invalid email format");
  });

  it("should return 400 for email without domain", async () => {
    const request = makeRequest({
      ...validContactData,
      email: "user@",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid email format");
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
    expect(data.error).toBe("Input too long");
  });

  it("should return 400 when message exceeds 5000 characters", async () => {
    const request = makeRequest({
      ...validContactData,
      message: "M".repeat(5001),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Input too long");
  });

  it("should return 400 when company exceeds 200 characters", async () => {
    const request = makeRequest({
      ...validContactData,
      company: "C".repeat(201),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Input too long");
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

  it("should return 503 when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const request = makeRequest(validContactData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("Service temporarily unavailable");
  });

  // ─── Resend Error ───

  it("should return 500 when email service fails", async () => {
    mockSend.mockRejectedValue(new Error("Resend API error"));

    const request = makeRequest(validContactData);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to send message");
  });
});
