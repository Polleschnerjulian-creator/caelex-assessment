/**
 * MFA Validate Route Tests
 *
 * Tests: rate limiting, invalid JSON, invalid input, 401 without session,
 * 401 on auth error, MFA not configured (auto-heal), backup code flow,
 * TOTP flow, replay protection, invalid code response, happy path + JWT update,
 * error handling (no stack traces).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mfaConfig: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockDecrypt = vi.fn();
vi.mock("@/lib/encryption", () => ({
  decrypt: (...args: unknown[]) => mockDecrypt(...args),
}));

vi.mock("otpauth", () => {
  const _validate = vi.fn();
  class MockSecret {
    static fromBase32 = vi.fn().mockReturnValue("mock-secret");
  }
  class MockTOTP {
    validate = _validate;
  }
  return { TOTP: MockTOTP, Secret: MockSecret, _validate };
});

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
const mockGetRequestContext = vi
  .fn()
  .mockReturnValue({ ipAddress: "1.2.3.4", userAgent: "test-agent" });
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

const mockRecordLoginEvent = vi.fn().mockResolvedValue(undefined);
const mockClearFailedAttempts = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/login-security.server", () => ({
  recordLoginEvent: (...args: unknown[]) => mockRecordLoginEvent(...args),
  clearFailedAttempts: (...args: unknown[]) => mockClearFailedAttempts(...args),
}));

const mockIsTotpCodeUsed = vi.fn();
const mockMarkTotpCodeUsed = vi.fn();
vi.mock("@/lib/mfa.server", () => ({
  isTotpCodeUsed: (...args: unknown[]) => mockIsTotpCodeUsed(...args),
  markTotpCodeUsed: (...args: unknown[]) => mockMarkTotpCodeUsed(...args),
}));

const mockGetToken = vi.fn();
const mockEncode = vi.fn();
vi.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
  encode: (...args: unknown[]) => mockEncode(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Import module under test ───

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";

// Access mocked internals
const mockPrisma = prisma as unknown as {
  mfaConfig: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const mockBcryptCompare = bcrypt.compare as unknown as ReturnType<typeof vi.fn>;
const mockTotpValidate = (
  OTPAuth as unknown as { _validate: ReturnType<typeof vi.fn> }
)._validate;

// ─── Helpers ───

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("https://app.caelex.com/api/auth/mfa/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("https://app.caelex.com/api/auth/mfa/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: "not-json{{{",
  });
}

// ─── Tests ───

describe("POST /api/auth/mfa/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    process.env.AUTH_SECRET = "test-secret";
    process.env.NODE_ENV = "test";
  });

  describe("Rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue({ success: false });
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toBe("Too many requests");
    });
  });

  describe("Input validation", () => {
    it("returns 400 on invalid JSON body", async () => {
      const res = await POST(makeInvalidJsonRequest());
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid JSON body");
    });

    it("returns 400 when code is missing", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid request");
    });

    it("returns 400 when code is too short", async () => {
      const res = await POST(makeRequest({ code: "123" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when code is too long", async () => {
      const res = await POST(makeRequest({ code: "12345678901" }));
      expect(res.status).toBe(400);
    });
  });

  describe("Authentication", () => {
    it("returns 401 when auth() throws", async () => {
      mockAuth.mockRejectedValue(new Error("Session error"));
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Session error");
    });

    it("returns 401 when no session user", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Session expired");
    });

    it("returns 401 when session has no user id", async () => {
      mockAuth.mockResolvedValue({ user: {} });
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(401);
    });
  });

  describe("MFA config lookup", () => {
    it("returns 500 on database error", async () => {
      mockPrisma.mfaConfig.findUnique.mockRejectedValue(new Error("DB down"));
      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("Database error");
      // Must not leak actual error
      expect(body.error).not.toContain("DB down");
    });

    it("auto-heals when MFA config not found", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(null);
      mockGetToken.mockResolvedValue({ sub: "user-1" });
      mockEncode.mockResolvedValue("new-jwt");

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.mfaVerified).toBe(true);
    });

    it("auto-heals when MFA is disabled", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue({ enabled: false });
      mockGetToken.mockResolvedValue({ sub: "user-1" });
      mockEncode.mockResolvedValue("new-jwt");

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("Backup code flow", () => {
    const mfaConfig = {
      enabled: true,
      encryptedSecret: "enc-secret",
      backupCodes: JSON.stringify(["$2a$12$hash1", "$2a$12$hash2"]),
    };

    it("returns 400 when no backup codes configured", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue({
        enabled: true,
        backupCodes: null,
      });
      const res = await POST(
        makeRequest({ code: "ABCD1234", isBackupCode: true }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("No backup codes");
    });

    it("returns 400 when backup code doesn't match", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockBcryptCompare.mockResolvedValue(false);

      const res = await POST(
        makeRequest({ code: "WRONGCODE", isBackupCode: true }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid code");
    });

    it("consumes backup code on success and updates DB", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockBcryptCompare.mockResolvedValueOnce(true); // first hash matches
      mockPrisma.mfaConfig.update.mockResolvedValue({});
      mockGetToken.mockResolvedValue({ sub: "user-1" });
      mockEncode.mockResolvedValue("new-jwt");

      const res = await POST(
        makeRequest({ code: "ABCD1234", isBackupCode: true }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify code was consumed (first hash set to "")
      expect(mockPrisma.mfaConfig.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: {
          backupCodes: expect.stringContaining('""'),
        },
      });
    });

    it("returns 500 on backup code verification error", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockBcryptCompare.mockRejectedValue(new Error("bcrypt failed"));

      const res = await POST(
        makeRequest({ code: "ABCD1234", isBackupCode: true }),
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("Backup code verification failed");
      expect(body.error).not.toContain("bcrypt failed");
    });
  });

  describe("TOTP code flow", () => {
    const mfaConfig = {
      enabled: true,
      encryptedSecret: "enc-secret",
      backupCodes: null,
    };

    it("returns 500 when decryption fails", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockDecrypt.mockRejectedValue(new Error("ENCRYPTION_KEY not set"));

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("decryption failed");
    });

    it("returns 500 when decrypted secret is empty", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockDecrypt.mockResolvedValue("");

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("corrupted");
    });

    it("returns 500 when TOTP verification throws", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockDecrypt.mockResolvedValue("JBSWY3DPEHPK3PXP");
      mockTotpValidate.mockImplementation(() => {
        throw new Error("Bad secret format");
      });

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("TOTP verification failed");
    });

    it("returns 400 when TOTP code is invalid", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockDecrypt.mockResolvedValue("JBSWY3DPEHPK3PXP");
      mockTotpValidate.mockReturnValue(null);

      const res = await POST(makeRequest({ code: "000000" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid code");
    });

    it("rejects replayed TOTP codes", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockDecrypt.mockResolvedValue("JBSWY3DPEHPK3PXP");
      mockTotpValidate.mockReturnValue(0); // valid
      mockIsTotpCodeUsed.mockResolvedValue(true); // already used

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid code");
    });

    it("marks code as used on valid TOTP", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue(mfaConfig);
      mockDecrypt.mockResolvedValue("JBSWY3DPEHPK3PXP");
      mockTotpValidate.mockReturnValue(0);
      mockIsTotpCodeUsed.mockResolvedValue(false);
      mockMarkTotpCodeUsed.mockResolvedValue(undefined);
      mockGetToken.mockResolvedValue({ sub: "user-1" });
      mockEncode.mockResolvedValue("new-jwt");

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(200);
      expect(mockMarkTotpCodeUsed).toHaveBeenCalledWith("user-1", "123456");
    });
  });

  describe("Happy path", () => {
    it("returns success and updates JWT on valid TOTP", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue({
        enabled: true,
        encryptedSecret: "enc-secret",
      });
      mockDecrypt.mockResolvedValue("JBSWY3DPEHPK3PXP");
      mockTotpValidate.mockReturnValue(0);
      mockIsTotpCodeUsed.mockResolvedValue(false);
      mockMarkTotpCodeUsed.mockResolvedValue(undefined);
      mockGetToken.mockResolvedValue({
        sub: "user-1",
        mfaRequired: true,
      });
      mockEncode.mockResolvedValue("updated-jwt");

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.mfaVerified).toBe(true);

      // Verify audit logging was called
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MFA_CHALLENGE_SUCCESS",
        }),
      );
      expect(mockClearFailedAttempts).toHaveBeenCalledWith("user-1");
    });

    it("logs failed attempt on invalid code", async () => {
      mockPrisma.mfaConfig.findUnique.mockResolvedValue({
        enabled: true,
        encryptedSecret: "enc-secret",
      });
      mockDecrypt.mockResolvedValue("JBSWY3DPEHPK3PXP");
      mockTotpValidate.mockReturnValue(null);

      const res = await POST(makeRequest({ code: "000000" }));
      expect(res.status).toBe(400);
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MFA_CHALLENGE_FAILED",
        }),
      );
      expect(mockRecordLoginEvent).toHaveBeenCalledWith(
        "user-1",
        "MFA_FAILED",
        expect.any(String),
        expect.any(String),
        "PASSWORD",
      );
    });
  });

  describe("Error handling (no stack traces leaked)", () => {
    it("returns generic error on unhandled exception", async () => {
      mockCheckRateLimit.mockImplementation(() => {
        throw new Error("Redis connection failed");
      });

      const res = await POST(makeRequest({ code: "123456" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("MFA validation failed");
      expect(body.error).not.toContain("Redis");
    });
  });
});
