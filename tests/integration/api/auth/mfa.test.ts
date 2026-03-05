import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    mfaConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mfa.server", () => ({
  setupMfa: vi.fn(),
  verifyMfaSetup: vi.fn(),
  validateMfaCode: vi.fn(),
  verifyAndConsumeBackupCode: vi.fn(),
  regenerateBackupCodes: vi.fn(),
  getMfaStatus: vi.fn(),
  disableMfa: vi.fn(),
  isTotpCodeUsed: vi.fn().mockResolvedValue(false),
  markTotpCodeUsed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => Promise.resolve(v)),
  decrypt: vi.fn((v: string) => Promise.resolve(v)),
  isEncrypted: vi.fn(() => false),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getRequestContext: vi.fn().mockReturnValue({
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
  }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock("@/lib/login-security.server", () => ({
  recordLoginEvent: vi.fn().mockResolvedValue(undefined),
  clearFailedAttempts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  getIdentifier: vi.fn().mockReturnValue("test-ip"),
  createRateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("otpauth", () => {
  // Shared mock validate function accessible via _mockValidate
  const _mockValidate = vi.fn().mockReturnValue(0);
  class MockTOTP {
    validate = _mockValidate;
  }
  const mockSecret = {
    fromBase32: vi.fn().mockReturnValue("mock-secret"),
  };
  return {
    default: { TOTP: MockTOTP, Secret: mockSecret },
    TOTP: MockTOTP,
    Secret: mockSecret,
    _mockValidate,
  };
});

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn().mockResolvedValue(null),
  encode: vi.fn().mockResolvedValue("mock-jwt"),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  setupMfa,
  verifyMfaSetup,
  validateMfaCode,
  verifyAndConsumeBackupCode,
  regenerateBackupCodes,
  getMfaStatus,
  disableMfa,
  isTotpCodeUsed,
} from "@/lib/mfa.server";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "@/lib/audit";
import {
  recordLoginEvent,
  clearFailedAttempts,
} from "@/lib/login-security.server";
import { decrypt } from "@/lib/encryption";

import { POST as setupRoute } from "@/app/api/auth/mfa/setup/route";
import { POST as verifyRoute } from "@/app/api/auth/mfa/verify/route";
import { DELETE as disableRoute } from "@/app/api/auth/mfa/disable/route";
import { GET as statusRoute } from "@/app/api/auth/mfa/status/route";
import { POST as validateRoute } from "@/app/api/auth/mfa/validate/route";
import { POST as backupCodesRoute } from "@/app/api/auth/mfa/backup-codes/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockSession = {
  user: {
    id: "user-123",
    email: "pilot@caelex.eu",
    name: "Test Pilot",
  },
};

function makePostRequest(url: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(url: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url: string): Request {
  return new Request(`http://localhost${url}`, {
    method: "GET",
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MFA API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/auth/mfa/setup
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/mfa/setup", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const request = makePostRequest("/api/auth/mfa/setup", {});
      const response = await setupRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no email", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123", email: null },
      } as never);

      const request = makePostRequest("/api/auth/mfa/setup", {});
      const response = await setupRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 200 with secret and QR code on success", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(setupMfa).mockResolvedValue({
        secret: "JBSWY3DPEHPK3PXP",
        qrCodeDataUrl: "data:image/png;base64,AAAA",
      });

      const request = makePostRequest("/api/auth/mfa/setup", {});
      const response = await setupRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.secret).toBe("JBSWY3DPEHPK3PXP");
      expect(data.qrCodeDataUrl).toBe("data:image/png;base64,AAAA");
      expect(data.message).toContain("Scan the QR code");
    });

    it("should call setupMfa with userId and email", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(setupMfa).mockResolvedValue({
        secret: "JBSWY3DPEHPK3PXP",
        qrCodeDataUrl: "data:image/png;base64,AAAA",
      });

      const request = makePostRequest("/api/auth/mfa/setup", {});
      await setupRoute(request);

      expect(setupMfa).toHaveBeenCalledWith("user-123", "pilot@caelex.eu");
    });

    it("should log an audit event on setup", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(setupMfa).mockResolvedValue({
        secret: "JBSWY3DPEHPK3PXP",
        qrCodeDataUrl: "data:image/png;base64,AAAA",
      });

      const request = makePostRequest("/api/auth/mfa/setup", {});
      await setupRoute(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_SETUP_INITIATED",
          entityType: "MfaConfig",
          entityId: "user-123",
        }),
      );
    });

    it("should return 500 when setupMfa throws", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(setupMfa).mockRejectedValue(new Error("Crypto failure"));

      const request = makePostRequest("/api/auth/mfa/setup", {});
      const response = await setupRoute(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to setup MFA");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/auth/mfa/verify
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/mfa/verify", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "123456",
      });
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for missing code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/verify", {});
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
      expect(data.details).toBeDefined();
    });

    it("should return 400 for non-numeric code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "abcdef",
      });
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 for code with wrong length (5 digits)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "12345",
      });
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 for code with wrong length (7 digits)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "1234567",
      });
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 when verification fails (invalid TOTP)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(verifyMfaSetup).mockResolvedValue({ success: false });

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "999999",
      });
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid verification code");
    });

    it("should log audit event on failed verification", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(verifyMfaSetup).mockResolvedValue({ success: false });

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "999999",
      });
      await verifyRoute(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_CHALLENGE_FAILED",
          entityType: "MfaConfig",
        }),
      );
    });

    it("should return 200 with backup codes on successful verification", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      const mockBackupCodes = [
        "AAAA1111",
        "BBBB2222",
        "CCCC3333",
        "DDDD4444",
        "EEEE5555",
        "FFFF6666",
        "GGGG7777",
        "HHHH8888",
        "IIII9999",
        "JJJJ0000",
      ];
      vi.mocked(verifyMfaSetup).mockResolvedValue({
        success: true,
        backupCodes: mockBackupCodes,
      });

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "123456",
      });
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.backupCodes).toEqual(mockBackupCodes);
      expect(data.backupCodes).toHaveLength(10);
      expect(data.message).toContain("MFA enabled successfully");
    });

    it("should log MFA_ENABLED audit event on success", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(verifyMfaSetup).mockResolvedValue({
        success: true,
        backupCodes: ["CODE1111"],
      });

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "123456",
      });
      await verifyRoute(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_ENABLED",
          entityType: "MfaConfig",
          metadata: expect.objectContaining({
            backupCodesGenerated: 1,
          }),
        }),
      );
    });

    it("should call verifyMfaSetup with correct userId and code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(verifyMfaSetup).mockResolvedValue({
        success: true,
        backupCodes: [],
      });

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "654321",
      });
      await verifyRoute(request);

      expect(verifyMfaSetup).toHaveBeenCalledWith("user-123", "654321");
    });

    it("should return 500 when verifyMfaSetup throws", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(verifyMfaSetup).mockRejectedValue(new Error("DB error"));

      const request = makePostRequest("/api/auth/mfa/verify", {
        code: "123456",
      });
      const response = await verifyRoute(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to verify MFA");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/auth/mfa/status
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/auth/mfa/status", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const response = await statusRoute();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return MFA status when MFA is disabled", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(getMfaStatus).mockResolvedValue({
        enabled: false,
        verifiedAt: null,
        remainingBackupCodes: 0,
      });

      const response = await statusRoute();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enabled).toBe(false);
      expect(data.verifiedAt).toBeNull();
      expect(data.remainingBackupCodes).toBe(0);
    });

    it("should return MFA status when MFA is enabled", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      const verifiedDate = new Date("2025-06-15T10:00:00Z");
      vi.mocked(getMfaStatus).mockResolvedValue({
        enabled: true,
        verifiedAt: verifiedDate,
        remainingBackupCodes: 8,
      });

      const response = await statusRoute();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enabled).toBe(true);
      expect(data.remainingBackupCodes).toBe(8);
    });

    it("should call getMfaStatus with correct userId", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(getMfaStatus).mockResolvedValue({
        enabled: false,
        verifiedAt: null,
        remainingBackupCodes: 0,
      });

      await statusRoute();

      expect(getMfaStatus).toHaveBeenCalledWith("user-123");
    });

    it("should return 500 when getMfaStatus throws", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(getMfaStatus).mockRejectedValue(new Error("DB error"));

      const response = await statusRoute();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get MFA status");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/auth/mfa/disable
  // ═══════════════════════════════════════════════════════════════════════════

  describe("DELETE /api/auth/mfa/disable", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "test",
      });
      const response = await disableRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when password is missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {});
      const response = await disableRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password is required");
    });

    it("should return 400 when password is an empty string", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "",
      });
      const response = await disableRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password is required");
    });

    it("should return 400 for OAuth-only accounts (no password set)", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: null,
      } as never);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "SomePassword1!",
      });
      const response = await disableRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot disable MFA for OAuth-only accounts");
    });

    it("should return 400 when password is invalid", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: "$2a$12$hashedpassword",
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "WrongPassword1!",
      });
      const response = await disableRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid password");
    });

    it("should return 200 and disable MFA on valid password", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: "$2a$12$hashedpassword",
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(disableMfa).mockResolvedValue(undefined);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "CorrectPassword1!",
      });
      const response = await disableRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("MFA has been disabled");
    });

    it("should call disableMfa with correct userId", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: "$2a$12$hashedpassword",
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(disableMfa).mockResolvedValue(undefined);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "CorrectPassword1!",
      });
      await disableRoute(request);

      expect(disableMfa).toHaveBeenCalledWith("user-123");
    });

    it("should verify password against stored hash", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: "$2a$12$storedHash",
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(disableMfa).mockResolvedValue(undefined);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "MyPassword123!",
      });
      await disableRoute(request);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "MyPassword123!",
        "$2a$12$storedHash",
      );
    });

    it("should log MFA_DISABLED audit event on success", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: "$2a$12$hashedpassword",
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(disableMfa).mockResolvedValue(undefined);

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "CorrectPassword1!",
      });
      await disableRoute(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_DISABLED",
          entityType: "MfaConfig",
          entityId: "user-123",
        }),
      );
    });

    it("should return 500 when disableMfa throws", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        password: "$2a$12$hashedpassword",
      } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(disableMfa).mockRejectedValue(new Error("DB error"));

      const request = makeDeleteRequest("/api/auth/mfa/disable", {
        password: "CorrectPassword1!",
      });
      const response = await disableRoute(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to disable MFA");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/auth/mfa/validate
  // Note: This route inlines MFA validation logic instead of calling
  // validateMfaCode. It directly uses prisma.mfaConfig, decrypt, OTPAuth, etc.
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/mfa/validate", () => {
    // Helper to set up mfaConfig mock for TOTP validation
    const mockMfaConfig = {
      userId: "user-123",
      enabled: true,
      encryptedSecret: "encrypted-secret-value",
      backupCodes: null,
    };

    it("should return 401 when no session and no userId provided", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Session expired");
    });

    it("should return 400 when code is missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/validate", {});
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
      expect(data.details).toBeDefined();
    });

    it("should return 400 when code is too short", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123",
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 when code is too long", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "12345678901",
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 200 on valid TOTP code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      // Mock OTPAuth.TOTP validate to return 0 (valid)
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(0);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Code verified successfully");
    });

    it("should return 400 on invalid TOTP code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      // Mock OTPAuth.TOTP validate to return null (invalid)
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(null);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "000000",
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code");
    });

    it("should return 401 when userId is provided in body with no session", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
        userId: "pre-auth-user",
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      // Route ignores body userId; returns 401 since no session
      expect(data.error).toContain("Session expired");
    });

    it("should use session userId even when userId is provided in body", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(0);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
        userId: "other-user",
      });
      await validateRoute(request);

      // The route uses session.user.id, not body userId
      expect(prisma.mfaConfig.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });
    });

    it("should validate backup code when isBackupCode is true", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        ...mockMfaConfig,
        backupCodes: JSON.stringify(["$2a$12$hashedcode1"]),
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "ABCD1234",
        isBackupCode: true,
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 400 on invalid backup code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        ...mockMfaConfig,
        backupCodes: JSON.stringify(["$2a$12$hashedcode1"]),
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "INVALID1",
        isBackupCode: true,
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code");
    });

    it("should log MFA_BACKUP_CODE_USED audit event on successful backup code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        ...mockMfaConfig,
        backupCodes: JSON.stringify(["$2a$12$hashedcode1"]),
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "ABCD1234",
        isBackupCode: true,
      });
      await validateRoute(request);

      // Wait for non-blocking audit calls
      await new Promise((r) => setTimeout(r, 10));

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_BACKUP_CODE_USED",
        }),
      );
    });

    it("should log MFA_CHALLENGE_FAILED audit event on failure", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(null);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "000000",
      });
      await validateRoute(request);

      // Wait for non-blocking audit calls
      await new Promise((r) => setTimeout(r, 10));

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_CHALLENGE_FAILED",
        }),
      );
    });

    it("should log MFA_CHALLENGE_SUCCESS audit event on success", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(0);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
      });
      await validateRoute(request);

      // Wait for non-blocking audit calls
      await new Promise((r) => setTimeout(r, 10));

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_CHALLENGE_SUCCESS",
        }),
      );
    });

    it("should record login event on successful TOTP validation", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(0);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
      });
      await validateRoute(request);

      // Wait for non-blocking audit calls
      await new Promise((r) => setTimeout(r, 10));

      expect(recordLoginEvent).toHaveBeenCalledWith(
        "user-123",
        "MFA_SUCCESS",
        expect.any(String),
        expect.any(String),
        "PASSWORD",
      );
    });

    it("should record login event on failed validation", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(null);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "000000",
      });
      await validateRoute(request);

      // Wait for non-blocking audit calls
      await new Promise((r) => setTimeout(r, 10));

      expect(recordLoginEvent).toHaveBeenCalledWith(
        "user-123",
        "MFA_FAILED",
        expect.any(String),
        expect.any(String),
        "PASSWORD",
      );
    });

    it("should clear failed attempts on successful MFA", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(0);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
      });
      await validateRoute(request);

      // Wait for non-blocking calls
      await new Promise((r) => setTimeout(r, 10));

      expect(clearFailedAttempts).toHaveBeenCalledWith("user-123");
    });

    it("should NOT clear failed attempts on failed MFA", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockResolvedValue("JBSWY3DPEHPK3PXP");
      const otpMod = await import("otpauth");
      (otpMod as any)._mockValidate.mockReturnValue(null);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "000000",
      });
      await validateRoute(request);

      // Wait for non-blocking calls
      await new Promise((r) => setTimeout(r, 10));

      expect(clearFailedAttempts).not.toHaveBeenCalled();
    });

    it("should record BACKUP_CODE_USED login event on successful backup code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        ...mockMfaConfig,
        backupCodes: JSON.stringify(["$2a$12$hashedcode1"]),
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "ABCD1234",
        isBackupCode: true,
      });
      await validateRoute(request);

      // Wait for non-blocking audit calls
      await new Promise((r) => setTimeout(r, 10));

      expect(recordLoginEvent).toHaveBeenCalledWith(
        "user-123",
        "BACKUP_CODE_USED",
        expect.any(String),
        expect.any(String),
        "PASSWORD",
      );
    });

    it("should return 500 when decrypt throws", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(
        mockMfaConfig as any,
      );
      vi.mocked(decrypt).mockRejectedValue(new Error("Decryption failed"));

      const request = makePostRequest("/api/auth/mfa/validate", {
        code: "123456",
      });
      const response = await validateRoute(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("MFA secret decryption failed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/auth/mfa/backup-codes
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/mfa/backup-codes", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "123456",
      });
      const response = await backupCodesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when code is missing", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {});
      const response = await backupCodesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
      expect(data.details).toBeDefined();
    });

    it("should return 400 for non-numeric code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "abcdef",
      });
      const response = await backupCodesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 for code with wrong length", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "12345",
      });
      const response = await backupCodesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 when current TOTP code is invalid", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(validateMfaCode).mockResolvedValue(false);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "999999",
      });
      const response = await backupCodesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid verification code");
    });

    it("should return 200 with new backup codes on valid TOTP", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(validateMfaCode).mockResolvedValue(true);
      const newCodes = [
        "NEWCODE1",
        "NEWCODE2",
        "NEWCODE3",
        "NEWCODE4",
        "NEWCODE5",
        "NEWCODE6",
        "NEWCODE7",
        "NEWCODE8",
        "NEWCODE9",
        "NEWCODE0",
      ];
      vi.mocked(regenerateBackupCodes).mockResolvedValue(newCodes);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "123456",
      });
      const response = await backupCodesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.backupCodes).toEqual(newCodes);
      expect(data.backupCodes).toHaveLength(10);
      expect(data.message).toContain("New backup codes generated");
    });

    it("should call validateMfaCode before regenerating", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(validateMfaCode).mockResolvedValue(true);
      vi.mocked(regenerateBackupCodes).mockResolvedValue(["CODE1"]);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "123456",
      });
      await backupCodesRoute(request);

      expect(validateMfaCode).toHaveBeenCalledWith("user-123", "123456");
      expect(regenerateBackupCodes).toHaveBeenCalledWith("user-123");
    });

    it("should NOT regenerate backup codes when TOTP validation fails", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(validateMfaCode).mockResolvedValue(false);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "999999",
      });
      await backupCodesRoute(request);

      expect(regenerateBackupCodes).not.toHaveBeenCalled();
    });

    it("should log MFA_BACKUP_CODES_GENERATED audit event", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(validateMfaCode).mockResolvedValue(true);
      vi.mocked(regenerateBackupCodes).mockResolvedValue([
        "A",
        "B",
        "C",
        "D",
        "E",
      ]);

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "123456",
      });
      await backupCodesRoute(request);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          action: "MFA_BACKUP_CODES_GENERATED",
          entityType: "MfaConfig",
          entityId: "user-123",
          metadata: expect.objectContaining({ count: 5 }),
        }),
      );
    });

    it("should return 500 when regenerateBackupCodes throws", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(validateMfaCode).mockResolvedValue(true);
      vi.mocked(regenerateBackupCodes).mockRejectedValue(
        new Error("MFA is not enabled"),
      );

      const request = makePostRequest("/api/auth/mfa/backup-codes", {
        code: "123456",
      });
      const response = await backupCodesRoute(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to regenerate backup codes");
    });
  });
});
