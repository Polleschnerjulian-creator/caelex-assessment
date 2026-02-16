import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────
vi.mock("server-only", () => ({}));

const { mockPrisma, mockLogSecurityEvent, mockSendEmail } = vi.hoisted(() => {
  const mockPrisma = {
    honeyToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    honeyTokenTrigger: {
      create: vi.fn(),
    },
  };
  const mockLogSecurityEvent = vi.fn().mockResolvedValue(undefined);
  const mockSendEmail = vi.fn().mockResolvedValue(undefined);
  return { mockPrisma, mockLogSecurityEvent, mockSendEmail };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => Promise.resolve(v)),
  decrypt: vi.fn((v: string) => Promise.resolve(v)),
  isEncrypted: vi.fn(() => false),
}));

vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: mockLogSecurityEvent,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
}));

import {
  createHoneyToken,
  checkForHoneyToken,
  listHoneyTokens,
  getHoneyTokenDetails,
  updateHoneyToken,
  deleteHoneyToken,
  generateFakeApiKey,
  generateFakeAwsCredential,
  generateFakeDatabaseUrl,
} from "@/lib/honey-tokens.server";

// ─── Helper ──────────────────────────────────────────────

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Tests ───────────────────────────────────────────────

describe("Honey Token Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // Token Generation (fake credential generators)
  // ════════════════════════════════════════════════════════

  describe("generateFakeApiKey", () => {
    it("should return a string starting with the default prefix and _fake_", () => {
      const key = generateFakeApiKey();
      expect(key.startsWith("caelex_fake_")).toBe(true);
    });

    it("should use a custom prefix when provided", () => {
      const key = generateFakeApiKey("myapp");
      expect(key.startsWith("myapp_fake_")).toBe(true);
    });

    it("should generate a key with exactly 32 random characters after the prefix", () => {
      const prefix = "caelex";
      const key = generateFakeApiKey(prefix);
      const randomPart = key.slice(`${prefix}_fake_`.length);
      expect(randomPart).toHaveLength(32);
    });

    it("should only contain alphanumeric characters in the random portion", () => {
      const key = generateFakeApiKey();
      const randomPart = key.slice("caelex_fake_".length);
      expect(randomPart).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    it("should generate unique keys each time", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 50; i++) {
        keys.add(generateFakeApiKey());
      }
      expect(keys.size).toBe(50);
    });
  });

  describe("generateFakeAwsCredential", () => {
    describe("access_key type", () => {
      it("should start with AKIAFAKE", () => {
        const key = generateFakeAwsCredential("access_key");
        expect(key.startsWith("AKIAFAKE")).toBe(true);
      });

      it("should be 20 characters total (8 prefix + 12 random)", () => {
        const key = generateFakeAwsCredential("access_key");
        expect(key).toHaveLength(20);
      });

      it("should contain only uppercase letters and digits 2-7 in the random part", () => {
        const key = generateFakeAwsCredential("access_key");
        const randomPart = key.slice(8);
        expect(randomPart).toMatch(/^[A-Z2-7]{12}$/);
      });

      it("should generate unique access keys", () => {
        const keys = new Set<string>();
        for (let i = 0; i < 50; i++) {
          keys.add(generateFakeAwsCredential("access_key"));
        }
        expect(keys.size).toBe(50);
      });
    });

    describe("secret type", () => {
      it("should be exactly 40 characters long", () => {
        const secret = generateFakeAwsCredential("secret");
        expect(secret).toHaveLength(40);
      });

      it("should contain only base64-like characters", () => {
        const secret = generateFakeAwsCredential("secret");
        expect(secret).toMatch(/^[A-Za-z0-9+/]{40}$/);
      });

      it("should generate unique secrets", () => {
        const secrets = new Set<string>();
        for (let i = 0; i < 50; i++) {
          secrets.add(generateFakeAwsCredential("secret"));
        }
        expect(secrets.size).toBe(50);
      });
    });
  });

  describe("generateFakeDatabaseUrl", () => {
    it("should generate a postgres URL by default", () => {
      const url = generateFakeDatabaseUrl();
      expect(url.startsWith("postgresql://")).toBe(true);
    });

    it("should generate a postgres URL when type is postgres", () => {
      const url = generateFakeDatabaseUrl("postgres");
      expect(url.startsWith("postgresql://")).toBe(true);
      expect(url).toContain(":5432/caelex_backup");
    });

    it("should generate a mysql URL when type is mysql", () => {
      const url = generateFakeDatabaseUrl("mysql");
      expect(url.startsWith("mysql://")).toBe(true);
      expect(url).toContain(":3306/caelex_backup");
    });

    it("should include admin_backup as the user", () => {
      const url = generateFakeDatabaseUrl();
      expect(url).toContain("admin_backup:");
    });

    it("should include a password starting with 'fake'", () => {
      const url = generateFakeDatabaseUrl();
      // Format: postgresql://admin_backup:fake<random>@host:5432/caelex_backup
      const passwordMatch = url.match(/:fake([^@]+)@/);
      expect(passwordMatch).not.toBeNull();
    });

    it("should include .internal.example.com in the host", () => {
      const url = generateFakeDatabaseUrl();
      expect(url).toContain(".internal.example.com");
    });

    it("should generate unique URLs each time", () => {
      const urls = new Set<string>();
      for (let i = 0; i < 20; i++) {
        urls.add(generateFakeDatabaseUrl());
      }
      expect(urls.size).toBe(20);
    });
  });

  // ════════════════════════════════════════════════════════
  // Token Creation
  // ════════════════════════════════════════════════════════

  describe("createHoneyToken", () => {
    it("should compute a SHA-256 hash of the token value and store it", async () => {
      const tokenValue = "test-token-value-123";
      const expectedHash = await sha256Hex(tokenValue);

      mockPrisma.honeyToken.create.mockResolvedValue({
        id: "ht-1",
        tokenType: "API_KEY",
        name: "Test Token",
        tokenValue,
        tokenHash: expectedHash,
      });

      await createHoneyToken({
        tokenType: "API_KEY" as never,
        name: "Test Token",
        tokenValue,
      });

      expect(mockPrisma.honeyToken.create).toHaveBeenCalledOnce();
      const callArgs = mockPrisma.honeyToken.create.mock.calls[0][0];
      expect(callArgs.data.tokenHash).toBe(expectedHash);
    });

    it("should pass all input fields to prisma.create", async () => {
      mockPrisma.honeyToken.create.mockResolvedValue({ id: "ht-2" });

      await createHoneyToken({
        tokenType: "DATABASE_URL" as never,
        name: "Decoy DB",
        description: "Planted in backup docs",
        tokenValue: "postgresql://fake@host/db",
        alertEmail: "security@caelex.com",
        alertWebhookUrl: "https://hooks.example.com/alert",
        contextPath: "/docs/backup.env",
        contextType: "env_file",
      });

      const callArgs = mockPrisma.honeyToken.create.mock.calls[0][0];
      expect(callArgs.data.tokenType).toBe("DATABASE_URL");
      expect(callArgs.data.name).toBe("Decoy DB");
      expect(callArgs.data.description).toBe("Planted in backup docs");
      expect(callArgs.data.tokenValue).toBe("postgresql://fake@host/db");
      expect(callArgs.data.alertEmail).toBe("security@caelex.com");
      expect(callArgs.data.alertWebhookUrl).toBe(
        "https://hooks.example.com/alert",
      );
      expect(callArgs.data.contextPath).toBe("/docs/backup.env");
      expect(callArgs.data.contextType).toBe("env_file");
    });

    it("should omit optional fields when not provided", async () => {
      mockPrisma.honeyToken.create.mockResolvedValue({ id: "ht-3" });

      await createHoneyToken({
        tokenType: "API_KEY" as never,
        name: "Minimal Token",
        tokenValue: "value123",
      });

      const callArgs = mockPrisma.honeyToken.create.mock.calls[0][0];
      expect(callArgs.data.description).toBeUndefined();
      expect(callArgs.data.alertEmail).toBeUndefined();
      expect(callArgs.data.alertWebhookUrl).toBeUndefined();
    });

    it("should return the prisma-created record", async () => {
      const mockRecord = {
        id: "ht-4",
        tokenType: "AWS_CREDENTIAL",
        name: "Fake AWS",
        tokenValue: "AKIAFAKETEST",
        tokenHash: "abc123",
        createdAt: new Date(),
      };
      mockPrisma.honeyToken.create.mockResolvedValue(mockRecord);

      const result = await createHoneyToken({
        tokenType: "AWS_CREDENTIAL" as never,
        name: "Fake AWS",
        tokenValue: "AKIAFAKETEST",
      });

      expect(result).toBe(mockRecord);
    });

    it("should produce a 64-character hex hash", async () => {
      mockPrisma.honeyToken.create.mockResolvedValue({ id: "ht-5" });

      await createHoneyToken({
        tokenType: "API_KEY" as never,
        name: "Test",
        tokenValue: "anything",
      });

      const callArgs = mockPrisma.honeyToken.create.mock.calls[0][0];
      expect(callArgs.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should produce the same hash for the same token value", async () => {
      mockPrisma.honeyToken.create.mockResolvedValue({ id: "ht-6" });

      await createHoneyToken({
        tokenType: "API_KEY" as never,
        name: "Token A",
        tokenValue: "duplicate-value",
      });

      await createHoneyToken({
        tokenType: "API_KEY" as never,
        name: "Token B",
        tokenValue: "duplicate-value",
      });

      const hash1 =
        mockPrisma.honeyToken.create.mock.calls[0][0].data.tokenHash;
      const hash2 =
        mockPrisma.honeyToken.create.mock.calls[1][0].data.tokenHash;
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different token values", async () => {
      mockPrisma.honeyToken.create.mockResolvedValue({ id: "ht-7" });

      await createHoneyToken({
        tokenType: "API_KEY" as never,
        name: "Token A",
        tokenValue: "value-one",
      });

      await createHoneyToken({
        tokenType: "API_KEY" as never,
        name: "Token B",
        tokenValue: "value-two",
      });

      const hash1 =
        mockPrisma.honeyToken.create.mock.calls[0][0].data.tokenHash;
      const hash2 =
        mockPrisma.honeyToken.create.mock.calls[1][0].data.tokenHash;
      expect(hash1).not.toBe(hash2);
    });
  });

  // ════════════════════════════════════════════════════════
  // Token Validation (checkForHoneyToken)
  // ════════════════════════════════════════════════════════

  describe("checkForHoneyToken", () => {
    it("should return triggered: false for empty string", async () => {
      const result = await checkForHoneyToken("");
      expect(result).toEqual({ triggered: false });
      expect(mockPrisma.honeyToken.findFirst).not.toHaveBeenCalled();
    });

    it("should return triggered: false when no matching token found", async () => {
      mockPrisma.honeyToken.findFirst.mockResolvedValue(null);

      const result = await checkForHoneyToken("some-random-value");
      expect(result).toEqual({ triggered: false });
    });

    it("should look up the token by SHA-256 hash and isActive", async () => {
      mockPrisma.honeyToken.findFirst.mockResolvedValue(null);

      const value = "my-secret-value";
      const expectedHash = await sha256Hex(value);

      await checkForHoneyToken(value);

      expect(mockPrisma.honeyToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: expectedHash,
          isActive: true,
        },
      });
    });

    it("should return triggered: true with token info when a match is found", async () => {
      const matchedToken = {
        id: "ht-match-1",
        name: "Decoy API Key",
        tokenType: "API_KEY",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      const result = await checkForHoneyToken("matched-value");

      expect(result.triggered).toBe(true);
      expect(result.tokenId).toBe("ht-match-1");
      expect(result.tokenName).toBe("Decoy API Key");
    });

    it("should create a trigger record when token is found", async () => {
      const matchedToken = {
        id: "ht-trigger-1",
        name: "Trigger Test",
        tokenType: "API_KEY",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      const context = {
        ipAddress: "192.168.1.100",
        userAgent: "curl/7.68.0",
        requestPath: "/api/v1/data",
        requestMethod: "GET",
      };

      await checkForHoneyToken("matched-value", context);

      expect(mockPrisma.honeyTokenTrigger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          honeyTokenId: "ht-trigger-1",
          ipAddress: "192.168.1.100",
          userAgent: "curl/7.68.0",
          requestPath: "/api/v1/data",
          requestMethod: "GET",
          severity: "HIGH",
        }),
      });
    });

    it("should increment triggerCount and update last-triggered fields", async () => {
      const matchedToken = {
        id: "ht-stats-1",
        name: "Stats Test",
        tokenType: "DATABASE_URL",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: "/env.backup",
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      const context = {
        ipAddress: "10.0.0.5",
        userAgent: "attacker-bot/1.0",
      };

      await checkForHoneyToken("db-url-value", context);

      expect(mockPrisma.honeyToken.update).toHaveBeenCalledWith({
        where: { id: "ht-stats-1" },
        data: {
          triggerCount: { increment: 1 },
          lastTriggeredAt: expect.any(Date),
          lastTriggeredIp: "10.0.0.5",
          lastTriggeredUa: "attacker-bot/1.0",
        },
      });
    });

    it("should log a CRITICAL security audit event when triggered", async () => {
      const matchedToken = {
        id: "ht-audit-1",
        name: "Audit Token",
        tokenType: "AWS_CREDENTIAL",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: "/config/aws",
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("aws-key-value", {
        ipAddress: "1.2.3.4",
        userAgent: "scanner/2.0",
        city: "Berlin",
        country: "Germany",
      });

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "HONEY_TOKEN_TRIGGERED",
          riskLevel: "CRITICAL",
          ipAddress: "1.2.3.4",
          userAgent: "scanner/2.0",
          city: "Berlin",
          country: "Germany",
          targetType: "honey_token",
          targetId: "ht-audit-1",
        }),
      );
    });

    it("should sanitize sensitive headers before storing in trigger record", async () => {
      const matchedToken = {
        id: "ht-headers-1",
        name: "Header Test",
        tokenType: "API_KEY",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("test-value", {
        requestHeaders: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret-token",
          Cookie: "session=abc123",
          "X-Api-Key": "real-api-key",
          "X-Auth-Token": "auth-token",
          "User-Agent": "Mozilla/5.0",
          "X-Custom-Header": "keep-this",
        },
      });

      const triggerData =
        mockPrisma.honeyTokenTrigger.create.mock.calls[0][0].data;
      const headers = triggerData.requestHeaders;

      // Sensitive headers should be redacted
      expect(headers["Authorization"]).toBe("[REDACTED]");
      expect(headers["Cookie"]).toBe("[REDACTED]");
      expect(headers["X-Api-Key"]).toBe("[REDACTED]");
      expect(headers["X-Auth-Token"]).toBe("[REDACTED]");

      // Non-sensitive headers should be preserved
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("Mozilla/5.0");
      expect(headers["X-Custom-Header"]).toBe("keep-this");
    });

    it("should not store headers when none provided", async () => {
      const matchedToken = {
        id: "ht-no-headers",
        name: "No Headers",
        tokenType: "API_KEY",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("test-value", {});

      const triggerData =
        mockPrisma.honeyTokenTrigger.create.mock.calls[0][0].data;
      expect(triggerData.requestHeaders).toBeUndefined();
    });

    it("should redact set-cookie header (case-insensitive key matching)", async () => {
      const matchedToken = {
        id: "ht-setcookie",
        name: "Set-Cookie Test",
        tokenType: "API_KEY",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("test-value", {
        requestHeaders: {
          "set-cookie": "session=xyz",
        },
      });

      const triggerData =
        mockPrisma.honeyTokenTrigger.create.mock.calls[0][0].data;
      expect(triggerData.requestHeaders["set-cookie"]).toBe("[REDACTED]");
    });
  });

  // ════════════════════════════════════════════════════════
  // Alert on Access (email + webhook alerts)
  // ════════════════════════════════════════════════════════

  describe("alert on access", () => {
    it("should send an email alert when alertEmail is configured", async () => {
      const matchedToken = {
        id: "ht-email-1",
        name: "Email Alert Token",
        tokenType: "API_KEY",
        alertEmail: "security@caelex.com",
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("email-trigger-value", {
        ipAddress: "10.0.0.1",
      });

      // sendHoneyTokenAlerts is called async (fire and forget), give it a tick
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "security@caelex.com",
          subject: expect.stringContaining("Email Alert Token"),
          html: expect.stringContaining("Honey Token Triggered"),
        }),
      );
    });

    it("should include IP address in email alert HTML", async () => {
      const matchedToken = {
        id: "ht-email-ip",
        name: "IP Token",
        tokenType: "API_KEY",
        alertEmail: "security@caelex.com",
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("ip-trigger-value", {
        ipAddress: "203.0.113.42",
        city: "Berlin",
        country: "Germany",
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("203.0.113.42"),
        }),
      );
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("Berlin, Germany"),
        }),
      );
    });

    it("should not send email when alertEmail is not configured", async () => {
      const matchedToken = {
        id: "ht-no-email",
        name: "No Email Token",
        tokenType: "API_KEY",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("no-email-value");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should include token metadata in security audit log", async () => {
      const matchedToken = {
        id: "ht-meta-1",
        name: "Metadata Token",
        tokenType: "DATABASE_URL",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: "/config/database.env",
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("meta-trigger-value", {
        ipAddress: "10.0.0.5",
        requestPath: "/api/v1/data",
      });

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            tokenName: "Metadata Token",
            tokenType: "DATABASE_URL",
            contextPath: "/config/database.env",
            requestPath: "/api/v1/data",
          }),
        }),
      );
    });

    it("should log description including token name and type", async () => {
      const matchedToken = {
        id: "ht-desc-1",
        name: "Descriptive Token",
        tokenType: "WEBHOOK_SECRET",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("desc-trigger-value");

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("Descriptive Token"),
        }),
      );
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("WEBHOOK_SECRET"),
        }),
      );
    });

    it("should not crash when email sending fails", async () => {
      mockSendEmail.mockRejectedValueOnce(new Error("SMTP down"));

      const matchedToken = {
        id: "ht-email-fail",
        name: "Email Fail Token",
        tokenType: "API_KEY",
        alertEmail: "alerts@caelex.com",
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      // Should not throw
      const result = await checkForHoneyToken("email-fail-value");
      expect(result.triggered).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it("should still create trigger record and audit log even when alerts fail", async () => {
      mockSendEmail.mockRejectedValueOnce(new Error("SMTP down"));

      const matchedToken = {
        id: "ht-fail-record",
        name: "Fail Record Token",
        tokenType: "API_KEY",
        alertEmail: "alerts@caelex.com",
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      await checkForHoneyToken("fail-record-value", {
        ipAddress: "10.0.0.1",
      });

      // Trigger record and audit log should still be created (before alerts)
      expect(mockPrisma.honeyTokenTrigger.create).toHaveBeenCalled();
      expect(mockPrisma.honeyToken.update).toHaveBeenCalled();
      expect(mockLogSecurityEvent).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // CRUD Operations
  // ════════════════════════════════════════════════════════

  describe("listHoneyTokens", () => {
    it("should query all honey tokens ordered by createdAt desc with trigger counts", async () => {
      const mockTokens = [
        { id: "ht-1", name: "Token 1", _count: { triggers: 5 } },
        { id: "ht-2", name: "Token 2", _count: { triggers: 0 } },
      ];
      mockPrisma.honeyToken.findMany.mockResolvedValue(mockTokens);

      const result = await listHoneyTokens();

      expect(mockPrisma.honeyToken.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { triggers: true },
          },
        },
      });
      expect(result).toBe(mockTokens);
    });
  });

  describe("getHoneyTokenDetails", () => {
    it("should query a specific token with its 50 most recent triggers", async () => {
      const mockDetail = {
        id: "ht-detail-1",
        name: "Detail Token",
        triggers: [{ id: "tr-1" }, { id: "tr-2" }],
      };
      mockPrisma.honeyToken.findUnique.mockResolvedValue(mockDetail);

      const result = await getHoneyTokenDetails("ht-detail-1");

      expect(mockPrisma.honeyToken.findUnique).toHaveBeenCalledWith({
        where: { id: "ht-detail-1" },
        include: {
          triggers: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });
      expect(result).toBe(mockDetail);
    });

    it("should return null for non-existent token", async () => {
      mockPrisma.honeyToken.findUnique.mockResolvedValue(null);

      const result = await getHoneyTokenDetails("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("updateHoneyToken", () => {
    it("should update the token with the provided data", async () => {
      mockPrisma.honeyToken.update.mockResolvedValue({
        id: "ht-update-1",
        name: "Updated Name",
        isActive: false,
      });

      await updateHoneyToken("ht-update-1", {
        name: "Updated Name",
        isActive: false,
      });

      expect(mockPrisma.honeyToken.update).toHaveBeenCalledWith({
        where: { id: "ht-update-1" },
        data: { name: "Updated Name", isActive: false },
      });
    });

    it("should allow setting alertEmail to null", async () => {
      mockPrisma.honeyToken.update.mockResolvedValue({ id: "ht-null-email" });

      await updateHoneyToken("ht-null-email", { alertEmail: null });

      expect(mockPrisma.honeyToken.update).toHaveBeenCalledWith({
        where: { id: "ht-null-email" },
        data: { alertEmail: null },
      });
    });

    it("should return the updated record", async () => {
      const updated = { id: "ht-ret", name: "New Name" };
      mockPrisma.honeyToken.update.mockResolvedValue(updated);

      const result = await updateHoneyToken("ht-ret", { name: "New Name" });
      expect(result).toBe(updated);
    });
  });

  describe("deleteHoneyToken", () => {
    it("should delete the token by id", async () => {
      mockPrisma.honeyToken.delete.mockResolvedValue({ id: "ht-del-1" });

      await deleteHoneyToken("ht-del-1");

      expect(mockPrisma.honeyToken.delete).toHaveBeenCalledWith({
        where: { id: "ht-del-1" },
      });
    });

    it("should return the deleted record", async () => {
      const deleted = { id: "ht-del-2", name: "Deleted Token" };
      mockPrisma.honeyToken.delete.mockResolvedValue(deleted);

      const result = await deleteHoneyToken("ht-del-2");
      expect(result).toBe(deleted);
    });
  });

  // ════════════════════════════════════════════════════════
  // Token Types Coverage
  // ════════════════════════════════════════════════════════

  describe("token types", () => {
    const tokenTypes = [
      "API_KEY",
      "DATABASE_URL",
      "AWS_CREDENTIAL",
      "OAUTH_SECRET",
      "ENCRYPTION_KEY",
      "WEBHOOK_SECRET",
      "JWT_SECRET",
      "SSH_KEY",
      "ADMIN_PASSWORD",
      "CUSTOM",
    ];

    it.each(tokenTypes)(
      "should accept %s as a valid token type for creation",
      async (tokenType) => {
        mockPrisma.honeyToken.create.mockResolvedValue({
          id: `ht-${tokenType}`,
        });

        await createHoneyToken({
          tokenType: tokenType as never,
          name: `Test ${tokenType}`,
          tokenValue: `value-for-${tokenType}`,
        });

        expect(mockPrisma.honeyToken.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            tokenType,
          }),
        });
      },
    );
  });

  // ════════════════════════════════════════════════════════
  // Edge Cases
  // ════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("should handle very long token values", async () => {
      mockPrisma.honeyToken.create.mockResolvedValue({ id: "ht-long" });
      const longValue = "a".repeat(10000);

      await createHoneyToken({
        tokenType: "CUSTOM" as never,
        name: "Long Token",
        tokenValue: longValue,
      });

      const callArgs = mockPrisma.honeyToken.create.mock.calls[0][0];
      expect(callArgs.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(callArgs.data.tokenValue).toBe(longValue);
    });

    it("should handle unicode in token values", async () => {
      mockPrisma.honeyToken.create.mockResolvedValue({ id: "ht-unicode" });

      await createHoneyToken({
        tokenType: "CUSTOM" as never,
        name: "Unicode Token",
        tokenValue: "token-with-emoji-\u{1F680}-and-umlauts-\u00E4\u00F6\u00FC",
      });

      const callArgs = mockPrisma.honeyToken.create.mock.calls[0][0];
      expect(callArgs.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle empty context gracefully in checkForHoneyToken", async () => {
      const matchedToken = {
        id: "ht-empty-ctx",
        name: "Empty Context",
        tokenType: "API_KEY",
        alertEmail: null,
        alertWebhookUrl: null,
        contextPath: null,
      };
      mockPrisma.honeyToken.findFirst.mockResolvedValue(matchedToken);
      mockPrisma.honeyTokenTrigger.create.mockResolvedValue({});
      mockPrisma.honeyToken.update.mockResolvedValue(matchedToken);

      const result = await checkForHoneyToken("some-value");

      expect(result.triggered).toBe(true);
      expect(mockPrisma.honeyTokenTrigger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          honeyTokenId: "ht-empty-ctx",
          ipAddress: undefined,
          userAgent: undefined,
          severity: "HIGH",
        }),
      });
    });
  });
});
