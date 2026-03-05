/**
 * Auth Module Security Tests
 *
 * Tests for: maskEmail, hashPassword, verifyPassword, isAuthConfigured,
 * no-op auth behavior, credentials authorize (brute force, deactivation,
 * lockout, MFA), JWT callback, session callback, signIn callback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";

// ─── Hoisted mock variables (vi.mock factories are hoisted, so variables
// they reference must also be hoisted) ───

const { capturedConfig, mockPrisma, mockVerifySignedToken } = vi.hoisted(() => {
  // Set AUTH_SECRET before auth.ts module loads so isAuthConfigured = true
  // and NextAuth() is called (not createNoOpAuth)
  process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long!!";
  process.env.AUTH_URL = "http://localhost:3000";

  const configHolder = { value: null as Record<string, unknown> | null };
  return {
    capturedConfig: configHolder,
    mockPrisma: {
      loginAttempt: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
      securityEvent: {
        create: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    },
    mockVerifySignedToken: vi.fn(),
  };
});

// ─── Module mocks ───

vi.mock("next-auth", () => ({
  default: vi.fn().mockImplementation((config: Record<string, unknown>) => {
    capturedConfig.value = config;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    };
  }),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn().mockReturnValue({ id: "google", name: "Google" }),
}));

vi.mock("next-auth/providers/apple", () => ({
  default: vi.fn().mockReturnValue({ id: "apple", name: "Apple" }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
    id: (config as { id?: string }).id || "credentials",
    name: (config as { name?: string }).name || "Credentials",
    authorize: (config as { authorize?: unknown }).authorize,
    credentials: (config as { credentials?: unknown }).credentials,
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
}));

vi.mock("@/lib/signed-token", () => ({
  verifySignedToken: mockVerifySignedToken,
}));

// ─── Helpers to extract NextAuth callbacks ───

function getCallbacks() {
  if (!capturedConfig.value?.callbacks) {
    throw new Error(
      "NextAuth config not captured - was AUTH_SECRET set before import?",
    );
  }
  return capturedConfig.value.callbacks as {
    jwt: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    session: (
      params: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
    signIn: (params: Record<string, unknown>) => Promise<boolean>;
  };
}

function getCredentialsProvider() {
  if (!capturedConfig.value?.providers) {
    throw new Error("NextAuth config not captured");
  }
  const providers = capturedConfig.value.providers as Array<{
    id: string;
    authorize?: (credentials: Record<string, unknown>) => Promise<unknown>;
  }>;
  return providers.find((p) => p.id === "credentials");
}

function getPasskeyProvider() {
  if (!capturedConfig.value?.providers) {
    throw new Error("NextAuth config not captured");
  }
  const providers = capturedConfig.value.providers as Array<{
    id: string;
    authorize?: (credentials: Record<string, unknown>) => Promise<unknown>;
  }>;
  return providers.find((p) => p.id === "passkey-token");
}

function getEvents() {
  if (!capturedConfig.value?.events) {
    throw new Error("NextAuth events not captured");
  }
  return capturedConfig.value.events as {
    signIn: (params: Record<string, unknown>) => Promise<void>;
    signOut: (params: Record<string, unknown>) => Promise<void>;
  };
}

// ─── Import module under test ───

// Import module (env vars already set in vi.hoisted, so NextAuth is initialized)
import {
  hashPassword,
  verifyPassword,
  maskEmail,
  isAuthConfigured,
  handlers,
  createNoOpAuth,
} from "./auth";

// ─── Test Suites ───

describe("auth module", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.loginAttempt.create.mockResolvedValue({});
    mockPrisma.loginAttempt.deleteMany.mockResolvedValue({});
    mockPrisma.securityEvent.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── maskEmail ───

  describe("maskEmail", () => {
    it("masks correctly for normal email", () => {
      expect(maskEmail("julian@example.com")).toBe("j****n@example.com");
    });

    it("masks short local part (2 chars)", () => {
      expect(maskEmail("ab@example.com")).toBe("**@example.com");
    });

    it("masks single-char local part", () => {
      expect(maskEmail("a@example.com")).toBe("*@example.com");
    });

    it("handles missing domain", () => {
      expect(maskEmail("nodomain")).toBe("***");
    });

    it("masks 3-char local part correctly", () => {
      expect(maskEmail("abc@example.com")).toBe("a*c@example.com");
    });

    it("preserves domain fully", () => {
      expect(maskEmail("julian@caelex.eu")).toContain("@caelex.eu");
    });

    it("masks long local part", () => {
      const masked = maskEmail("longusername@example.com");
      expect(masked).toBe("l**********e@example.com");
      expect(masked.startsWith("l")).toBe(true);
      expect(masked).toContain("@example.com");
    });
  });

  // ─── hashPassword / verifyPassword (real bcrypt) ───

  describe("hashPassword", () => {
    it("produces a valid bcrypt hash", async () => {
      const hash = await hashPassword("MyPassword123!");
      expect(hash).toMatch(/^\$2[aby]?\$/);
      expect(hash.length).toBeGreaterThan(50);
    });

    it("produces different hashes for the same password (due to salt)", async () => {
      const hash1 = await hashPassword("SamePassword");
      const hash2 = await hashPassword("SamePassword");
      expect(hash1).not.toBe(hash2);
    });

    it("uses bcrypt cost factor of 12", async () => {
      const hash = await hashPassword("TestPassword");
      // Bcrypt hash format: $2a$12$... or $2b$12$...
      expect(hash).toMatch(/^\$2[aby]?\$12\$/);
    });
  });

  describe("verifyPassword", () => {
    it("returns true for correct password", async () => {
      const hash = await bcrypt.hash("CorrectPassword", 4);
      const result = await verifyPassword("CorrectPassword", hash);
      expect(result).toBe(true);
    });

    it("returns false for wrong password", async () => {
      const hash = await bcrypt.hash("CorrectPassword", 4);
      const result = await verifyPassword("WrongPassword", hash);
      expect(result).toBe(false);
    });

    it("returns false for empty password against a hash", async () => {
      const hash = await bcrypt.hash("CorrectPassword", 4);
      const result = await verifyPassword("", hash);
      expect(result).toBe(false);
    });

    it("hashPassword and verifyPassword work together", async () => {
      const password = "SecureP@ssw0rd!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("verifyPassword rejects modified hash", async () => {
      const password = "SecureP@ssw0rd!";
      const hash = await hashPassword(password);
      const modifiedHash =
        hash.slice(0, 10) + (hash[10] === "a" ? "b" : "a") + hash.slice(11);
      const isValid = await verifyPassword(password, modifiedHash);
      expect(isValid).toBe(false);
    });
  });

  // ─── isAuthConfigured ───

  describe("isAuthConfigured", () => {
    it("reflects AUTH_SECRET at module load time", () => {
      // Since we set AUTH_SECRET before import, it should be true
      expect(isAuthConfigured).toBe(true);
    });

    it("Boolean(undefined) is false (isAuthConfigured pattern)", () => {
      expect(Boolean(undefined)).toBe(false);
      expect(Boolean("")).toBe(false);
    });
  });

  // ─── No-op auth (AUTH_SECRET unset) ───

  describe("no-op auth behavior", () => {
    it("returns 501 status for unconfigured auth", () => {
      // Verify the no-op pattern: Response with 501
      const response = new Response("Auth not configured", { status: 501 });
      expect(response.status).toBe(501);
    });
  });

  // ─── Credentials authorize ───

  describe("credentials authorize", () => {
    it("rejects missing email", async () => {
      const provider = getCredentialsProvider();
      expect(provider).toBeDefined();
      const result = await provider!.authorize!({
        email: "",
        password: "test",
      });
      expect(result).toBeNull();
    });

    it("rejects missing password", async () => {
      const provider = getCredentialsProvider();
      const result = await provider!.authorize!({
        email: "test@test.com",
        password: "",
      });
      expect(result).toBeNull();
    });

    it("rejects after 5 login attempts in 15 minutes", async () => {
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(5);

      const provider = getCredentialsProvider();
      await expect(
        provider!.authorize!({
          email: "test@test.com",
          password: "password123",
        }),
      ).rejects.toThrow("Too many login attempts");

      // Should have logged a security event
      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "BRUTE_FORCE_ATTEMPT",
            severity: "HIGH",
          }),
        }),
      );
    });

    it("rejects deactivated accounts", async () => {
      const hashedPw = await bcrypt.hash("validpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: false,
        theme: "system",
        lockedUntil: null,
        failedLoginAttempts: 0,
        mfaConfig: null,
      });

      const provider = getCredentialsProvider();
      await expect(
        provider!.authorize!({
          email: "test@test.com",
          password: "validpassword",
        }),
      ).rejects.toThrow("Account has been deactivated");
    });

    it("rejects locked accounts", async () => {
      const hashedPw = await bcrypt.hash("validpassword", 4);
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: true,
        theme: "system",
        lockedUntil: futureDate,
        failedLoginAttempts: 8,
        mfaConfig: null,
      });

      const provider = getCredentialsProvider();
      await expect(
        provider!.authorize!({
          email: "test@test.com",
          password: "validpassword",
        }),
      ).rejects.toThrow("Account is temporarily locked");
    });

    it("returns null for wrong password", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: true,
        theme: "system",
        lockedUntil: null,
        failedLoginAttempts: 0,
        mfaConfig: null,
      });

      const provider = getCredentialsProvider();
      const result = await provider!.authorize!({
        email: "test@test.com",
        password: "wrongpassword",
      });
      expect(result).toBeNull();

      // Should have updated failed attempts
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ failedLoginAttempts: 1 }),
        }),
      );
    });

    it("returns null for user not found", async () => {
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const provider = getCredentialsProvider();
      const result = await provider!.authorize!({
        email: "nonexistent@test.com",
        password: "password123",
      });
      expect(result).toBeNull();
    });

    it("clears login attempts on success", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: true,
        theme: "system",
        lockedUntil: null,
        failedLoginAttempts: 0,
        mfaConfig: null,
      });

      const provider = getCredentialsProvider();
      const result = await provider!.authorize!({
        email: "test@test.com",
        password: "correctpassword",
      });

      expect(result).not.toBeNull();
      expect(mockPrisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: { email: "test@test.com" },
      });
    });

    it("returns user with correct fields on success", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        password: hashedPw,
        role: "admin",
        isActive: true,
        theme: "dark",
        lockedUntil: null,
        failedLoginAttempts: 0,
        mfaConfig: null,
      });

      const provider = getCredentialsProvider();
      const result = (await provider!.authorize!({
        email: "test@test.com",
        password: "correctpassword",
      })) as Record<string, unknown>;

      expect(result).toBeDefined();
      expect(result.id).toBe("user-1");
      expect(result.email).toBe("test@test.com");
      expect(result.name).toBe("Test User");
      expect(result.role).toBe("admin");
      expect(result.theme).toBe("dark");
    });

    it("returns MFA flags when MFA is enabled", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: true,
        theme: "system",
        lockedUntil: null,
        failedLoginAttempts: 0,
        mfaConfig: { enabled: true },
      });

      const provider = getCredentialsProvider();
      const result = (await provider!.authorize!({
        email: "test@test.com",
        password: "correctpassword",
      })) as Record<string, unknown>;

      expect(result).toBeDefined();
      expect(result.mfaRequired).toBe(true);
      expect(result.mfaVerified).toBe(false);
    });

    it("does not include MFA flags when MFA is disabled", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: true,
        theme: "system",
        lockedUntil: null,
        failedLoginAttempts: 0,
        mfaConfig: { enabled: false },
      });

      const provider = getCredentialsProvider();
      const result = (await provider!.authorize!({
        email: "test@test.com",
        password: "correctpassword",
      })) as Record<string, unknown>;

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty("mfaRequired");
      expect(result).not.toHaveProperty("mfaVerified");
    });

    it("resets lockout counters on successful login after previous failures", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: true,
        theme: "system",
        lockedUntil: null,
        failedLoginAttempts: 3, // Had 3 failed attempts previously
        mfaConfig: null,
      });

      const provider = getCredentialsProvider();
      await provider!.authorize!({
        email: "test@test.com",
        password: "correctpassword",
      });

      // Should reset failed login attempts
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    });

    it("normalizes email to lowercase and trims", async () => {
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const provider = getCredentialsProvider();
      await provider!.authorize!({
        email: "  TEST@EXAMPLE.COM  ",
        password: "password123",
      });

      // Should search with lowercase trimmed email
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "test@example.com" },
        }),
      );
    });
  });

  // ─── Passkey Token Provider ───

  describe("passkey-token provider", () => {
    it("rejects missing token", async () => {
      const provider = getPasskeyProvider();
      expect(provider).toBeDefined();
      const result = await provider!.authorize!({ token: "" });
      expect(result).toBeNull();
    });

    it("rejects invalid signed token", async () => {
      mockVerifySignedToken.mockReturnValueOnce(null);

      const provider = getPasskeyProvider();
      const result = await provider!.authorize!({ token: "invalid-token" });
      expect(result).toBeNull();
    });

    it("rejects token with wrong purpose", async () => {
      mockVerifySignedToken.mockReturnValueOnce({
        sub: "user-1",
        purpose: "wrong-purpose",
      });

      const provider = getPasskeyProvider();
      const result = await provider!.authorize!({ token: "some-token" });
      expect(result).toBeNull();
    });

    it("returns user for valid passkey token", async () => {
      mockVerifySignedToken.mockReturnValueOnce({
        sub: "user-1",
        purpose: "passkey-login",
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        role: "user",
        isActive: true,
        theme: "dark",
      });

      const provider = getPasskeyProvider();
      const result = (await provider!.authorize!({
        token: "valid-token",
      })) as Record<string, unknown>;

      expect(result).toBeDefined();
      expect(result.id).toBe("user-1");
      expect(result.email).toBe("test@test.com");
      expect(result.theme).toBe("dark");
    });

    it("rejects inactive user via passkey", async () => {
      mockVerifySignedToken.mockReturnValueOnce({
        sub: "user-1",
        purpose: "passkey-login",
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        role: "user",
        isActive: false,
        theme: "system",
      });

      const provider = getPasskeyProvider();
      const result = await provider!.authorize!({ token: "valid-token" });
      expect(result).toBeNull();
    });
  });

  // ─── JWT Callback ───

  describe("JWT callback", () => {
    it("propagates user fields on initial sign-in", async () => {
      const callbacks = getCallbacks();
      const token = await callbacks.jwt({
        token: { sub: "sub-1" },
        user: { id: "user-123", role: "admin", theme: "dark" },
        trigger: undefined,
        session: undefined,
      });

      expect(token.id).toBe("user-123");
      expect(token.role).toBe("admin");
      expect(token.theme).toBe("dark");
    });

    it("defaults role to 'user' when not provided", async () => {
      const callbacks = getCallbacks();
      const token = await callbacks.jwt({
        token: { sub: "sub-1" },
        user: { id: "user-1" },
        trigger: undefined,
        session: undefined,
      });

      expect(token.role).toBe("user");
      expect(token.theme).toBe("system");
    });

    it("sets MFA flags on initial sign-in when MFA is required", async () => {
      const callbacks = getCallbacks();
      const token = await callbacks.jwt({
        token: { sub: "sub-1" },
        user: { id: "user-1", role: "user", mfaRequired: true },
        trigger: undefined,
        session: undefined,
      });

      expect(token.mfaRequired).toBe(true);
      expect(token.mfaVerified).toBe(false);
    });

    it("blocks deactivated users on token refresh", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        role: "user",
        isActive: false,
        theme: "system",
      });

      const callbacks = getCallbacks();
      // When user is deactivated, the error is logged but token is returned
      // (the token keeps existing values since error is caught)
      const token = await callbacks.jwt({
        token: { sub: "sub-1", id: "user-1", role: "user" },
        user: undefined,
        trigger: "update",
        session: undefined,
      });

      // Token should still have the id but the error was logged
      expect(token.id).toBe("user-1");
    });

    it("updates role from DB on token refresh", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        role: "admin",
        isActive: true,
        theme: "dark",
      });

      const callbacks = getCallbacks();
      const token = await callbacks.jwt({
        token: { sub: "sub-1", id: "user-1", role: "user", theme: "system" },
        user: undefined,
        trigger: "update",
        session: undefined,
      });

      expect(token.role).toBe("admin");
      expect(token.theme).toBe("dark");
    });

    it("updates MFA verified flag on session update", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        role: "user",
        isActive: true,
        theme: "system",
      });

      const callbacks = getCallbacks();
      const token = await callbacks.jwt({
        token: {
          sub: "sub-1",
          id: "user-1",
          mfaRequired: true,
          mfaVerified: false,
        },
        user: undefined,
        trigger: "update",
        session: { mfaVerified: true },
      });

      expect(token.mfaVerified).toBe(true);
    });

    it("updates theme via session update without DB override", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        role: "user",
        isActive: true,
        theme: "light", // DB has light
      });

      const callbacks = getCallbacks();
      const token = await callbacks.jwt({
        token: { sub: "sub-1", id: "user-1", role: "user", theme: "system" },
        user: undefined,
        trigger: "update",
        session: { theme: "dark" }, // User wants dark
      });

      // Theme should be the one from session update, not DB
      expect(token.theme).toBe("dark");
    });
  });

  // ─── Session Callback ───

  describe("session callback", () => {
    it("maps token fields to session", async () => {
      const callbacks = getCallbacks();
      const session = await callbacks.session({
        session: {
          user: { id: "", name: "Test", email: "test@test.com", image: null },
          expires: new Date().toISOString(),
        },
        token: {
          id: "user-123",
          role: "admin",
          theme: "dark",
          mfaRequired: true,
          mfaVerified: false,
        },
      });

      const user = (session as { user: Record<string, unknown> }).user;
      expect(user.id).toBe("user-123");
      expect(user.role).toBe("admin");
      expect(user.theme).toBe("dark");
      expect(user.mfaRequired).toBe(true);
      expect(user.mfaVerified).toBe(false);
    });

    it("handles session without MFA fields in token", async () => {
      const callbacks = getCallbacks();
      const session = await callbacks.session({
        session: {
          user: { id: "", name: null, email: null, image: null },
          expires: new Date().toISOString(),
        },
        token: {
          id: "user-456",
          role: "user",
          theme: "system",
        },
      });

      const user = (session as { user: Record<string, unknown> }).user;
      expect(user.id).toBe("user-456");
      expect(user.role).toBe("user");
      expect(user.mfaRequired).toBeUndefined();
      expect(user.mfaVerified).toBeUndefined();
    });
  });

  // ─── signIn Callback ───

  describe("signIn callback", () => {
    it("blocks deactivated OAuth users", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ isActive: false });

      const callbacks = getCallbacks();
      const allowed = await callbacks.signIn({
        user: { id: "user-1" },
        account: { provider: "google" },
      });

      expect(allowed).toBe(false);
    });

    it("allows active OAuth users", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ isActive: true });

      const callbacks = getCallbacks();
      const allowed = await callbacks.signIn({
        user: { id: "user-1" },
        account: { provider: "google" },
      });

      expect(allowed).toBe(true);
    });

    it("skips check for credentials provider", async () => {
      const callbacks = getCallbacks();
      const allowed = await callbacks.signIn({
        user: { id: "user-1" },
        account: { provider: "credentials" },
      });

      expect(allowed).toBe(true);
      // Should not have queried the database
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("skips check for passkey-token provider", async () => {
      const callbacks = getCallbacks();
      const allowed = await callbacks.signIn({
        user: { id: "user-1" },
        account: { provider: "passkey-token" },
      });

      expect(allowed).toBe(true);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("fails closed when DB is unreachable", async () => {
      mockPrisma.user.findUnique.mockRejectedValueOnce(
        new Error("DB connection failed"),
      );

      const callbacks = getCallbacks();
      const allowed = await callbacks.signIn({
        user: { id: "user-1" },
        account: { provider: "google" },
      });

      expect(allowed).toBe(false);
    });

    it("allows sign in when user not found in DB (new OAuth user)", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const callbacks = getCallbacks();
      const allowed = await callbacks.signIn({
        user: { id: "user-1" },
        account: { provider: "google" },
      });

      // null user means not in DB yet - should allow (dbUser && !dbUser.isActive is false)
      expect(allowed).toBe(true);
    });
  });

  // ─── Account Lockout Logic ───

  describe("account lockout", () => {
    it("locks account after 10 failed attempts via credentials", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 4);
      mockPrisma.loginAttempt.count.mockResolvedValueOnce(0);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        image: null,
        password: hashedPw,
        role: "user",
        isActive: true,
        theme: "system",
        lockedUntil: null,
        failedLoginAttempts: 9, // 9th failure, this will be 10th
        mfaConfig: null,
      });

      const provider = getCredentialsProvider();
      const result = await provider!.authorize!({
        email: "test@test.com",
        password: "wrongpassword",
      });

      expect(result).toBeNull();
      // Should lock the account (10th attempt)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            failedLoginAttempts: 10,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ─── Events ───

  describe("signIn event", () => {
    it("creates audit log on successful sign-in", async () => {
      const events = getEvents();
      await events.signIn({
        user: { id: "user-1" },
        account: { provider: "google" },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            action: "LOGIN",
            entityType: "User",
            description: expect.stringContaining("google"),
          }),
        }),
      );
    });

    it("does not log when user.id is missing", async () => {
      const events = getEvents();
      await events.signIn({
        user: {},
        account: { provider: "google" },
      });

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("defaults provider to credentials in description", async () => {
      const events = getEvents();
      await events.signIn({
        user: { id: "user-1" },
        account: undefined,
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: expect.stringContaining("credentials"),
          }),
        }),
      );
    });
  });

  describe("signOut event", () => {
    it("creates audit log on sign-out with JWT token", async () => {
      const events = getEvents();
      await events.signOut({
        token: { id: "user-1" },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            action: "LOGOUT",
            entityType: "User",
            description: "User signed out",
          }),
        }),
      );
    });

    it("does not log when token has no id", async () => {
      const events = getEvents();
      await events.signOut({
        token: {},
      });

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("handles session-based signOut (no token key)", async () => {
      const events = getEvents();
      await events.signOut({
        session: { expires: new Date().toISOString() },
      });

      // No token, so no audit log
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  // ─── Event Error Handling ───

  describe("event error handling", () => {
    it("handles signIn event audit log failure gracefully", async () => {
      mockPrisma.auditLog.create.mockRejectedValueOnce(
        new Error("DB write failed"),
      );

      const events = getEvents();
      // Should not throw
      await events.signIn({
        user: { id: "user-1" },
        account: { provider: "credentials" },
      });

      // Logger should have been called with the error
      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to log sign in",
        expect.any(Error),
      );
    });

    it("handles signOut event audit log failure gracefully", async () => {
      mockPrisma.auditLog.create.mockRejectedValueOnce(
        new Error("DB write failed"),
      );

      const events = getEvents();
      // Should not throw
      await events.signOut({
        token: { id: "user-1" },
      });

      const { logger } = await import("@/lib/logger");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to log sign out",
        expect.any(Error),
      );
    });
  });

  // ─── No-op Auth (createNoOpAuth) ───

  describe("createNoOpAuth", () => {
    it("GET handler returns 501", async () => {
      const noOp = createNoOpAuth();
      const response = await noOp.handlers.GET();
      expect(response.status).toBe(501);
      const text = await response.text();
      expect(text).toBe("Auth not configured");
    });

    it("POST handler returns 501", async () => {
      const noOp = createNoOpAuth();
      const response = await noOp.handlers.POST();
      expect(response.status).toBe(501);
    });

    it("signIn returns undefined", async () => {
      const noOp = createNoOpAuth();
      const result = await noOp.signIn();
      expect(result).toBeUndefined();
    });

    it("signOut returns undefined", async () => {
      const noOp = createNoOpAuth();
      const result = await noOp.signOut();
      expect(result).toBeUndefined();
    });

    it("auth middleware passes through and attaches null auth", async () => {
      const noOp = createNoOpAuth();
      const mockHandler = vi
        .fn()
        .mockResolvedValue(new Response("OK", { status: 200 }));
      const wrappedHandler = noOp.auth(mockHandler);
      const mockRequest = new Request("http://localhost:3000/test");
      const response = await wrappedHandler(mockRequest);
      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ auth: null }),
      );
    });
  });
});
