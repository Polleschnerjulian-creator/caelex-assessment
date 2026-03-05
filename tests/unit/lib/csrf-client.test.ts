import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the csrf module to provide cookie/header name constants
vi.mock("@/lib/csrf", () => ({
  CSRF_COOKIE_NAME: "csrf-token",
  CSRF_HEADER_NAME: "x-csrf-token",
}));

import { getCsrfToken, csrfHeaders, CSRF_HEADER_NAME } from "@/lib/csrf-client";

describe("csrf-client", () => {
  // ─── getCsrfToken ───

  describe("getCsrfToken", () => {
    it("returns undefined when document is undefined (server-side)", () => {
      // In Node/Vitest, document is not defined by default in non-jsdom environments,
      // but vitest may set it up. We need to temporarily unset it.
      const originalDocument = globalThis.document;
      // @ts-expect-error - intentionally removing document for test
      delete globalThis.document;

      expect(getCsrfToken()).toBeUndefined();

      // Restore
      globalThis.document = originalDocument;
    });

    it("returns undefined when cookie is not set", () => {
      // Set up a mock document with no matching cookie
      const originalDocument = globalThis.document;
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "" },
        writable: true,
        configurable: true,
      });

      expect(getCsrfToken()).toBeUndefined();

      // Restore
      globalThis.document = originalDocument;
    });

    it("returns undefined when cookie has other cookies but not csrf", () => {
      const originalDocument = globalThis.document;
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "session=abc123; other=value" },
        writable: true,
        configurable: true,
      });

      expect(getCsrfToken()).toBeUndefined();

      globalThis.document = originalDocument;
    });

    it("returns the decoded CSRF token when cookie is set", () => {
      const originalDocument = globalThis.document;
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "csrf-token=my-token-value" },
        writable: true,
        configurable: true,
      });

      expect(getCsrfToken()).toBe("my-token-value");

      globalThis.document = originalDocument;
    });

    it("returns the decoded CSRF token when cookie is among multiple cookies", () => {
      const originalDocument = globalThis.document;
      Object.defineProperty(globalThis, "document", {
        value: {
          cookie: "session=abc123; csrf-token=encoded%20token; other=val",
        },
        writable: true,
        configurable: true,
      });

      expect(getCsrfToken()).toBe("encoded token");

      globalThis.document = originalDocument;
    });
  });

  // ─── csrfHeaders ───

  describe("csrfHeaders", () => {
    it("returns empty object when no token is available", () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error - intentionally removing document for test
      delete globalThis.document;

      expect(csrfHeaders()).toEqual({});

      globalThis.document = originalDocument;
    });

    it("returns headers with CSRF token when token is available", () => {
      const originalDocument = globalThis.document;
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "csrf-token=test-csrf-value" },
        writable: true,
        configurable: true,
      });

      const headers = csrfHeaders();
      expect(headers).toEqual({ "x-csrf-token": "test-csrf-value" });

      globalThis.document = originalDocument;
    });
  });

  // ─── CSRF_HEADER_NAME re-export ───

  describe("CSRF_HEADER_NAME re-export", () => {
    it("re-exports CSRF_HEADER_NAME from csrf module", () => {
      expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
    });
  });
});
