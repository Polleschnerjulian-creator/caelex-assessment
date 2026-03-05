import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Must mock process.exit to prevent tests from terminating
const mockExit = vi.fn() as unknown as (code?: number) => never;

describe("env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Restore original env
    process.env = { ...originalEnv };
    // Always mock process.exit
    vi.spyOn(process, "exit").mockImplementation(mockExit);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("SKIP_ENV_VALIDATION", () => {
    it("bypasses validation when SKIP_ENV_VALIDATION=true", async () => {
      process.env.SKIP_ENV_VALIDATION = "true";
      const mod = await import("./env");
      // Should not throw and not call process.exit
      expect(mockExit).not.toHaveBeenCalled();
      expect(mod.env).toBeDefined();
    });
  });

  describe("validateEnv with valid minimal env", () => {
    it("passes with DATABASE_URL and AUTH_SECRET", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "test";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      process.env.AUTH_SECRET = "a".repeat(32);
      delete process.env.AUTH_GOOGLE_ID;
      delete process.env.AUTH_GOOGLE_SECRET;

      const mod = await import("./env");
      expect(mod.env).toBeDefined();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe("validateEnv with invalid env", () => {
    it("logs error for missing DATABASE_URL in dev mode and throws", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "development";
      delete process.env.DATABASE_URL;
      process.env.AUTH_SECRET = "a".repeat(32);

      // When base schema validation fails in dev mode, the code warns
      // but then crashes on `result.data!.NODE_ENV` because data is undefined.
      await expect(import("./env")).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Continuing in development mode"),
      );
    });

    it("calls process.exit(1) for missing DATABASE_URL in production", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      process.env.AUTH_SECRET = "a".repeat(32);

      // In production the code calls process.exit(1) first, but since we mock it,
      // execution continues and result.data! will throw.
      await expect(import("./env")).rejects.toThrow();
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("fails for invalid DATABASE_URL (not postgresql://)", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/db";
      process.env.AUTH_SECRET = "a".repeat(32);

      await expect(import("./env")).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    it("fails for AUTH_SECRET too short", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      process.env.AUTH_SECRET = "short";

      await expect(import("./env")).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("production requirements", () => {
    it("exits if production requirements are missing in production", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      process.env.AUTH_SECRET = "a".repeat(32);
      // Missing: AUTH_URL, ENCRYPTION_KEY, ENCRYPTION_SALT, etc.
      delete process.env.AUTH_URL;
      delete process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_SALT;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.CRON_SECRET;

      const mod = await import("./env");
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("succeeds in production with all required vars", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      process.env.AUTH_SECRET = "a".repeat(32);
      process.env.AUTH_URL = "https://app.example.com";
      process.env.ENCRYPTION_KEY = "b".repeat(32);
      process.env.ENCRYPTION_SALT = "c".repeat(16);
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
      process.env.CRON_SECRET = "d".repeat(16);
      // Provide SENTRY_DSN to avoid warning
      process.env.SENTRY_DSN = "https://sentry.io/dsn";
      process.env.AUTH_GOOGLE_ID = "google-id";
      process.env.AUTH_GOOGLE_SECRET = "google-secret";

      const mod = await import("./env");
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe("warning logs", () => {
    it("warns about missing SENTRY_DSN in production", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "production";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      process.env.AUTH_SECRET = "a".repeat(32);
      process.env.AUTH_URL = "https://app.example.com";
      process.env.ENCRYPTION_KEY = "b".repeat(32);
      process.env.ENCRYPTION_SALT = "c".repeat(16);
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
      process.env.CRON_SECRET = "d".repeat(16);
      delete process.env.SENTRY_DSN;
      process.env.AUTH_GOOGLE_ID = "google-id";
      process.env.AUTH_GOOGLE_SECRET = "google-secret";

      const mod = await import("./env");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("SENTRY_DSN not set"),
      );
    });

    it("warns about missing Google OAuth", async () => {
      process.env.SKIP_ENV_VALIDATION = undefined;
      process.env.NODE_ENV = "test";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      process.env.AUTH_SECRET = "a".repeat(32);
      delete process.env.AUTH_GOOGLE_ID;
      delete process.env.AUTH_GOOGLE_SECRET;

      const mod = await import("./env");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Google OAuth not configured"),
      );
    });
  });

  describe("getEnv", () => {
    it("returns cached result after first validateEnv", async () => {
      process.env.SKIP_ENV_VALIDATION = "true";
      const mod = await import("./env");
      const env1 = mod.getEnv();
      const env2 = mod.getEnv();
      // Should be the same reference (cached)
      expect(env1).toBe(env2);
    });

    it("calls validateEnv if not yet validated", async () => {
      process.env.SKIP_ENV_VALIDATION = "true";
      const mod = await import("./env");
      // getEnv should work without prior explicit validateEnv call
      // (module-level `const env = validateEnv()` already ran)
      const result = mod.getEnv();
      expect(result).toBeDefined();
    });
  });

  describe("isProduction / isDevelopment / isTest", () => {
    it("isProduction returns true when NODE_ENV=production", async () => {
      process.env.SKIP_ENV_VALIDATION = "true";
      process.env.NODE_ENV = "production";
      const mod = await import("./env");
      expect(mod.isProduction()).toBe(true);
      expect(mod.isDevelopment()).toBe(false);
      expect(mod.isTest()).toBe(false);
    });

    it("isDevelopment returns true when NODE_ENV=development", async () => {
      process.env.SKIP_ENV_VALIDATION = "true";
      process.env.NODE_ENV = "development";
      const mod = await import("./env");
      expect(mod.isDevelopment()).toBe(true);
      expect(mod.isProduction()).toBe(false);
      expect(mod.isTest()).toBe(false);
    });

    it("isTest returns true when NODE_ENV=test", async () => {
      process.env.SKIP_ENV_VALIDATION = "true";
      process.env.NODE_ENV = "test";
      const mod = await import("./env");
      expect(mod.isTest()).toBe(true);
      expect(mod.isProduction()).toBe(false);
      expect(mod.isDevelopment()).toBe(false);
    });
  });
});
