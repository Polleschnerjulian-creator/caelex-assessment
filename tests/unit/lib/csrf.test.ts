import { describe, it, expect } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
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

  describe("generateCsrfToken", () => {
    it("generates a 64-character hex string", () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens each time", () => {
      const tokens = new Set(
        Array.from({ length: 10 }, () => generateCsrfToken()),
      );
      expect(tokens.size).toBe(10);
    });
  });

  describe("validateCsrfToken", () => {
    it("returns true when cookie and header match", () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    it("returns false when cookie is undefined", () => {
      expect(validateCsrfToken(undefined, "some-token")).toBe(false);
    });

    it("returns false when header is null", () => {
      expect(validateCsrfToken("some-token", null)).toBe(false);
    });

    it("returns false when both are missing", () => {
      expect(validateCsrfToken(undefined, null)).toBe(false);
    });

    it("returns false when tokens do not match", () => {
      const tokenA = generateCsrfToken();
      const tokenB = generateCsrfToken();
      expect(validateCsrfToken(tokenA, tokenB)).toBe(false);
    });

    it("returns false when lengths differ", () => {
      expect(validateCsrfToken("short", "longer-token")).toBe(false);
    });

    it("uses constant-time comparison (same-length different values)", () => {
      const base = "a".repeat(64);
      const different = "b".repeat(64);
      expect(validateCsrfToken(base, different)).toBe(false);
    });

    it("handles empty strings", () => {
      expect(validateCsrfToken("", "")).toBe(false);
    });
  });
});
