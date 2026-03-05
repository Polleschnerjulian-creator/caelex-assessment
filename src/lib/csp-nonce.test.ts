import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so the mock function is available before vi.mock is hoisted
const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: mockGet,
  }),
}));

import {
  CSP_NONCE_HEADER,
  generateNonce,
  getNonce,
  SCRIPT_HASHES,
  buildCspHeader,
  buildApiCspHeader,
} from "./csp-nonce";

describe("csp-nonce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CSP_NONCE_HEADER", () => {
    it("equals 'x-csp-nonce'", () => {
      expect(CSP_NONCE_HEADER).toBe("x-csp-nonce");
    });
  });

  describe("generateNonce", () => {
    it("returns a base64 string", () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe("string");
      // Base64 pattern: A-Z, a-z, 0-9, +, /, =
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("returns unique values on each call", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it("returns a non-empty string", () => {
      const nonce = generateNonce();
      expect(nonce.length).toBeGreaterThan(0);
    });
  });

  describe("getNonce", () => {
    it("reads nonce from headers", async () => {
      mockGet.mockReturnValue("test-nonce-value");
      const nonce = await getNonce();
      expect(nonce).toBe("test-nonce-value");
      expect(mockGet).toHaveBeenCalledWith(CSP_NONCE_HEADER);
    });

    it("returns undefined when header is not present", async () => {
      mockGet.mockReturnValue(null);
      const nonce = await getNonce();
      expect(nonce).toBeUndefined();
    });
  });

  describe("SCRIPT_HASHES", () => {
    it("has a themeScript property", () => {
      expect(SCRIPT_HASHES).toHaveProperty("themeScript");
    });

    it("themeScript is a SHA-256 hash string", () => {
      expect(SCRIPT_HASHES.themeScript).toMatch(/^sha256-/);
    });
  });

  describe("buildCspHeader", () => {
    it("includes default-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("default-src 'self'");
    });

    it("includes script-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("script-src");
      expect(csp).toContain("'self'");
      expect(csp).toContain("'unsafe-inline'");
    });

    it("includes style-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("includes font-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("font-src");
    });

    it("includes img-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("img-src");
    });

    it("includes connect-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("connect-src");
    });

    it("includes frame-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("frame-src");
    });

    it("includes frame-ancestors 'none'", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("includes object-src 'none'", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("object-src 'none'");
    });

    it("includes upgrade-insecure-requests", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("includes worker-src directive", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("worker-src 'self' blob:");
    });

    it("includes form-action 'self'", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("form-action 'self'");
    });

    it("includes base-uri 'self'", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("base-uri 'self'");
    });

    it("includes manifest-src 'self'", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("manifest-src 'self'");
    });

    it("adds 'unsafe-eval' when isDev is true", () => {
      const csp = buildCspHeader("test-nonce", true);
      expect(csp).toContain("'unsafe-eval'");
    });

    it("does not include 'unsafe-eval' when isDev is false", () => {
      const csp = buildCspHeader("test-nonce", false);
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it("does not include 'unsafe-eval' when isDev is undefined (default)", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it("joins directives with semicolons", () => {
      const csp = buildCspHeader("test-nonce");
      const directives = csp.split("; ");
      expect(directives.length).toBeGreaterThan(5);
    });

    it("includes Google domains in script-src", () => {
      const csp = buildCspHeader("test-nonce");
      expect(csp).toContain("https://accounts.google.com");
      expect(csp).toContain("https://apis.google.com");
    });

    it("includes blob: in script-src for PDF workers", () => {
      const csp = buildCspHeader("test-nonce");
      // script-src should contain blob:
      const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"));
      expect(scriptSrc).toContain("blob:");
    });
  });

  describe("buildApiCspHeader", () => {
    it("returns strict CSP with default-src none", () => {
      const csp = buildApiCspHeader();
      expect(csp).toBe("default-src 'none'; frame-ancestors 'none'");
    });

    it("includes frame-ancestors 'none'", () => {
      const csp = buildApiCspHeader();
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });
});
