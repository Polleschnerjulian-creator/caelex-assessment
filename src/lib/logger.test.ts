import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { maskEmail, logger } from "@/lib/logger";

describe("Logger Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("maskEmail", () => {
    it("should mask a normal email address", () => {
      const result = maskEmail("julian@caelex.eu");
      expect(result).toBe("j****n@caelex.eu");
    });

    it("should mask email with longer local part", () => {
      const result = maskEmail("alexander@example.com");
      // "alexander" length=9, first char 'a', last char 'r', 4 stars in between (min(9-2,4)=4)
      expect(result).toBe("a****r@example.com");
    });

    it("should mask email with 3-char local part", () => {
      const result = maskEmail("abc@test.com");
      // length=3, first 'a', last 'c', min(3-2,4)=1 star
      expect(result).toBe("a*c@test.com");
    });

    it("should handle short local part (2 chars)", () => {
      const result = maskEmail("ab@test.com");
      // length <= 2: local[0] + *** + @domain
      expect(result).toBe("a***@test.com");
    });

    it("should handle single char local part", () => {
      const result = maskEmail("a@test.com");
      // length <= 2: local[0] + *** + @domain
      expect(result).toBe("a***@test.com");
    });

    it("should return [invalid-email] for string without @", () => {
      const result = maskEmail("not-an-email");
      expect(result).toBe("[invalid-email]");
    });

    it("should return [invalid-email] for empty string", () => {
      const result = maskEmail("");
      expect(result).toBe("[invalid-email]");
    });

    it("should handle email with subdomain", () => {
      const result = maskEmail("user@mail.example.com");
      expect(result).toBe("u**r@mail.example.com");
    });
  });

  // Tests for non-production mode (default in test env: NODE_ENV=test)
  describe("logger (non-production mode)", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleDebugSpy.mockRestore();
    });

    describe("logger.error", () => {
      it("should log formatted message to console.error in dev", () => {
        logger.error("Something failed");

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("[ERROR]");
        expect(logMsg).toContain("Something failed");
      });

      it("should include Error details in dev mode", () => {
        const testError = new Error("Test error message");
        logger.error("Operation failed", testError);

        // First call: formatted log entry, second call: stack trace
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("Operation failed");
        expect(logMsg).toContain("Test error message");
        // Second call is the stack
        expect(consoleErrorSpy.mock.calls[1][0]).toContain("Error:");
      });

      it("should log with context", () => {
        logger.error("Failed", undefined, { userId: "user-1" });

        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("user-1");
      });

      it("should log with both error and context", () => {
        const err = new Error("boom");
        logger.error("Failed", err, { requestId: "req-1" });

        expect(consoleErrorSpy).toHaveBeenCalled();
        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("Failed");
        expect(logMsg).toContain("req-1");
      });

      it("should sanitize object errors with sensitive keys", () => {
        const sensitiveObj = {
          password: "secret123",
          token: "abc-token",
          normalField: "visible",
        };
        logger.error("Error with sensitive data", sensitiveObj);

        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("[REDACTED]");
        expect(logMsg).toContain("visible");
        expect(logMsg).not.toContain("secret123");
        expect(logMsg).not.toContain("abc-token");
      });

      it("should truncate long string values in object errors", () => {
        const longString = "x".repeat(600);
        const obj = { data: longString };
        logger.error("Long data", obj);

        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("[TRUNCATED]");
        expect(logMsg).not.toContain(longString);
      });

      it("should handle non-object, non-Error values", () => {
        logger.error("String error", "just a string");

        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("just a string");
      });

      it("should handle null error", () => {
        logger.error("Null error", null);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      });

      it("should handle undefined error (no error arg)", () => {
        logger.error("No error");

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("No error");
      });
    });

    describe("logger.warn", () => {
      it("should log formatted warning", () => {
        logger.warn("Warning message");

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("[WARN]");
        expect(logMsg).toContain("Warning message");
      });

      it("should include context in warning", () => {
        logger.warn("Rate limit approaching", {
          userId: "user-1",
          remaining: 5,
        });

        const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("user-1");
      });

      it("should log without context", () => {
        logger.warn("Simple warning");

        const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("Simple warning");
      });
    });

    describe("logger.info", () => {
      it("should log formatted info message", () => {
        logger.info("User logged in");

        expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleInfoSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("[INFO]");
        expect(logMsg).toContain("User logged in");
      });

      it("should include context in info", () => {
        logger.info("User logged in", { userId: "user-1" });

        const logMsg = consoleInfoSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("user-1");
      });
    });

    describe("logger.debug", () => {
      it("should log debug messages in non-production", () => {
        logger.debug("Debug info");

        expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleDebugSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("[DEBUG]");
        expect(logMsg).toContain("Debug info");
      });

      it("should include context in debug", () => {
        logger.debug("Debug data", { key: "value" });

        const logMsg = consoleDebugSpy.mock.calls[0][0] as string;
        expect(logMsg).toContain("value");
      });
    });

    describe("logger.security", () => {
      it("should log high severity security events to console.error", () => {
        logger.security("UNAUTHORIZED_ACCESS", { ip: "10.0.0.1" }, "high");

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(logMsg);
        expect(parsed.level).toBe("security");
        expect(parsed.event).toBe("UNAUTHORIZED_ACCESS");
        expect(parsed.severity).toBe("high");
      });

      it("should log critical severity security events to console.error", () => {
        logger.security("BRUTE_FORCE_ATTEMPT", { attempts: 100 }, "critical");

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(logMsg);
        expect(parsed.severity).toBe("critical");
      });

      it("should log medium severity to console.warn", () => {
        logger.security("RATE_LIMIT_EXCEEDED", { count: 50 }, "medium");

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(logMsg);
        expect(parsed.severity).toBe("medium");
      });

      it("should log low severity to console.warn", () => {
        logger.security("SUSPICIOUS_ACTIVITY", { info: "test" }, "low");

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it("should default to medium severity", () => {
        logger.security("SUSPICIOUS_ACTIVITY", { info: "test" });

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(logMsg);
        expect(parsed.severity).toBe("medium");
      });

      it("should include details without sanitization in dev mode", () => {
        const details = { password: "secret", info: "visible" };
        logger.security("TEST_EVENT", details, "low");

        const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(logMsg);
        // In non-production, details are NOT sanitized
        expect(parsed.details.password).toBe("secret");
        expect(parsed.details.info).toBe("visible");
      });

      it("should include timestamp in security log", () => {
        logger.security("TEST_EVENT", {}, "low");

        const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(logMsg);
        expect(parsed.timestamp).toBeDefined();
      });
    });
  });

  describe("logger (production mode)", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
    let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

    // We need to reset modules and re-import with NODE_ENV=production
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleDebugSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });

    async function getProdLogger() {
      vi.resetModules();
      process.env.NODE_ENV = "production";
      const mod = await import("@/lib/logger");
      return mod;
    }

    it("should output JSON to console.error for logger.error in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.error("Production error");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logMsg);
      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("Production error");
      expect(parsed.timestamp).toBeDefined();
    });

    it("should redact Error message in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.error("Failed", new Error("Sensitive DB info"));

      const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logMsg);
      expect(parsed.error.message).toBe("[REDACTED]");
      expect(parsed.error).not.toHaveProperty("stack");
    });

    it("should not print stack trace in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.error("Failed", new Error("boom"));

      // Only one call to console.error (JSON output), no stack trace
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should output JSON for logger.warn in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.warn("Production warning", { count: 5 });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logMsg = consoleWarnSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logMsg);
      expect(parsed.level).toBe("warn");
      expect(parsed.message).toBe("Production warning");
      expect(parsed.count).toBe(5);
    });

    it("should output JSON for logger.info in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.info("Production info", { userId: "u-1" });

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logMsg = consoleInfoSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logMsg);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("Production info");
      expect(parsed.userId).toBe("u-1");
    });

    it("should NOT log debug messages in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.debug("Debug info that should be suppressed");

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it("should sanitize security event details in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.security(
        "TEST_EVENT",
        { password: "secret", info: "visible" },
        "high",
      );

      const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logMsg);
      expect(parsed.details.password).toBe("[REDACTED]");
      expect(parsed.details.info).toBe("visible");
    });

    it("should sanitize object with apiKey in production", async () => {
      const { logger: prodLogger } = await getProdLogger();

      prodLogger.error("Error", { apiKey: "sk-123", status: 200 });

      const logMsg = consoleErrorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(logMsg);
      expect(parsed.error.apiKey).toBe("[REDACTED]");
      expect(parsed.error.status).toBe(200);
    });

    it("should mask email using maskEmail in production module", async () => {
      const { maskEmail: prodMaskEmail } = await getProdLogger();

      expect(prodMaskEmail("test@example.com")).toBe("t**t@example.com");
    });
  });
});
