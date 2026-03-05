import { describe, it, expect } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
  hashSessionId,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "@/lib/csrf";

describe("CSRF Protection", () => {
  describe("constants", () => {
    it("exports expected cookie name", () => {
      expect(CSRF_COOKIE_NAME).toBe("csrf-token");
    });

    it("exports expected header name", () => {
      expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
    });
  });

  describe("hashSessionId", () => {
    it("returns a 16-character hex string (8 bytes)", async () => {
      const hash = await hashSessionId("test-session-id");
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it("returns consistent output for the same input", async () => {
      const hash1 = await hashSessionId("my-session-123");
      const hash2 = await hashSessionId("my-session-123");
      expect(hash1).toBe(hash2);
    });

    it("returns different output for different inputs", async () => {
      const hash1 = await hashSessionId("session-aaa");
      const hash2 = await hashSessionId("session-bbb");
      expect(hash1).not.toBe(hash2);
    });

    it("handles empty string input", async () => {
      const hash = await hashSessionId("");
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it("handles long input strings", async () => {
      const longSession = "x".repeat(10000);
      const hash = await hashSessionId(longSession);
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it("handles unicode characters", async () => {
      const hash = await hashSessionId("session-über-日本語");
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe("generateCsrfToken", () => {
    it("generates a 64-character hex string", async () => {
      const token = await generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens each time", async () => {
      const tokens = new Set(
        await Promise.all(
          Array.from({ length: 10 }, () => generateCsrfToken()),
        ),
      );
      expect(tokens.size).toBe(10);
    });

    it("generates session-bound token with dot separator when sessionId provided", async () => {
      const token = await generateCsrfToken("my-session");
      expect(token).toContain(".");
      const [random, sessionHash] = token.split(".");
      expect(random).toHaveLength(64);
      expect(random).toMatch(/^[0-9a-f]{64}$/);
      expect(sessionHash).toHaveLength(16);
      expect(sessionHash).toMatch(/^[0-9a-f]{16}$/);
    });

    it("binds the session hash to the correct sessionId", async () => {
      const token = await generateCsrfToken("specific-session");
      const sessionHash = token.split(".")[1];
      const expectedHash = await hashSessionId("specific-session");
      expect(sessionHash).toBe(expectedHash);
    });
  });

  describe("validateCsrfToken", () => {
    it("returns true when cookie and header match", async () => {
      const token = await generateCsrfToken();
      expect(await validateCsrfToken(token, token)).toBe(true);
    });

    it("returns false when cookie is undefined", async () => {
      expect(await validateCsrfToken(undefined, "some-token")).toBe(false);
    });

    it("returns false when header is null", async () => {
      expect(await validateCsrfToken("some-token", null)).toBe(false);
    });

    it("returns false when both are missing", async () => {
      expect(await validateCsrfToken(undefined, null)).toBe(false);
    });

    it("returns false when tokens do not match", async () => {
      const tokenA = await generateCsrfToken();
      const tokenB = await generateCsrfToken();
      expect(await validateCsrfToken(tokenA, tokenB)).toBe(false);
    });

    it("returns false when lengths differ", async () => {
      expect(await validateCsrfToken("short", "longer-token")).toBe(false);
    });

    it("uses constant-time comparison (same-length different values)", async () => {
      const base = "a".repeat(64);
      const different = "b".repeat(64);
      expect(await validateCsrfToken(base, different)).toBe(false);
    });

    it("handles empty strings", async () => {
      expect(await validateCsrfToken("", "")).toBe(false);
    });

    it("validates session-bound tokens with correct sessionId", async () => {
      const sessionId = "session-abc-123";
      const token = await generateCsrfToken(sessionId);
      expect(await validateCsrfToken(token, token, sessionId)).toBe(true);
    });

    it("rejects session-bound tokens with wrong sessionId", async () => {
      const token = await generateCsrfToken("session-correct");
      expect(await validateCsrfToken(token, token, "session-wrong")).toBe(
        false,
      );
    });

    it("validates session-bound token without sessionId check (no sessionId param)", async () => {
      const token = await generateCsrfToken("some-session");
      // When no sessionId is passed, session binding is not verified
      expect(await validateCsrfToken(token, token)).toBe(true);
    });
  });
});
