/**
 * MFA Verify Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockVerifyMfaSetup = vi.fn();
vi.mock("@/lib/mfa.server", () => ({
  verifyMfaSetup: (...a: unknown[]) => mockVerifyMfaSetup(...a),
}));

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}));

const mockLogAuditEvent = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...a: unknown[]) => mockLogAuditEvent(...a),
  getRequestContext: vi
    .fn()
    .mockReturnValue({ ipAddress: "1.2.3.4", userAgent: "test" }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";

function makePost(body: unknown): Request {
  return new Request("https://app.caelex.com/api/auth/mfa/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/mfa/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockVerifyMfaSetup.mockReset();
    mockCheckRateLimit.mockReset();
    mockLogAuditEvent.mockReset();
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });
    expect((await POST(makePost({}))).status).toBe(429);
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(makePost({}))).status).toBe(401);
  });

  it("returns 400 on invalid code format", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    expect((await POST(makePost({ code: "abc" }))).status).toBe(400);
  });

  it("returns 400 when verification fails", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockVerifyMfaSetup.mockResolvedValue({ success: false });
    const res = await POST(makePost({ code: "123456" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid verification code");
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MFA_CHALLENGE_FAILED" }),
    );
  });

  it("enables MFA on valid code", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockVerifyMfaSetup.mockResolvedValue({
      success: true,
      backupCodes: ["bc1", "bc2", "bc3"],
    });
    const res = await POST(makePost({ code: "123456" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.backupCodes).toEqual(["bc1", "bc2", "bc3"]);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MFA_ENABLED" }),
    );
  });

  it("returns 500 on error without leaking details", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockVerifyMfaSetup.mockRejectedValue(new Error("DB crash"));
    const res = await POST(makePost({ code: "123456" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("DB crash");
  });
});
