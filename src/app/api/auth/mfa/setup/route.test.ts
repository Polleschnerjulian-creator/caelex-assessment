/**
 * MFA Setup Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockSetupMfa = vi.fn();
vi.mock("@/lib/mfa.server", () => ({
  setupMfa: (...a: unknown[]) => mockSetupMfa(...a),
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

function makePost(): Request {
  return new Request("https://app.caelex.com/api/auth/mfa/setup", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

describe("POST /api/auth/mfa/setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockSetupMfa.mockReset();
    mockCheckRateLimit.mockReset();
    mockLogAuditEvent.mockReset();
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });
    expect((await POST(makePost())).status).toBe(429);
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(makePost())).status).toBe(401);
  });

  it("returns 401 without email in session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    expect((await POST(makePost())).status).toBe(401);
  });

  it("returns secret and QR code on valid request", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mockSetupMfa.mockResolvedValue({
      secret: "JBSWY3DPEHPK3PXP",
      qrCodeDataUrl: "data:image/png;base64,abc",
    });
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(body.qrCodeDataUrl).toContain("data:image");
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MFA_SETUP_INITIATED" }),
    );
  });

  it("returns 500 on error without leaking details", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mockSetupMfa.mockRejectedValue(new Error("Crypto fail"));
    const res = await POST(makePost());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("Crypto fail");
  });
});
