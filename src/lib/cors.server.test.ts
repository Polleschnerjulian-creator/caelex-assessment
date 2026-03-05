import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Minimal NextResponse mock using a Headers-like object that returns null for missing keys
vi.mock("next/server", () => {
  class MockHeaders {
    private store = new Map<string, string>();
    set(key: string, value: string) {
      this.store.set(key, value);
    }
    get(key: string): string | null {
      return this.store.get(key) ?? null;
    }
    has(key: string): boolean {
      return this.store.has(key);
    }
  }

  class MockNextResponse {
    headers: MockHeaders;
    status: number;
    body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new MockHeaders();
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

import { applyCorsHeaders, handleCorsPreflightResponse } from "./cors.server";
import { NextResponse } from "next/server";

describe("cors.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyCorsHeaders", () => {
    it("sets Access-Control-Allow-Origin to * when allowedOrigins is *", () => {
      const response = new NextResponse(null, { status: 200 });
      const result = applyCorsHeaders(response, "https://example.com", "*");

      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("does not set Vary header when allowedOrigins is *", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, "https://example.com", "*");

      expect(response.headers.get("Vary")).toBeNull();
    });

    it("sets Access-Control-Allow-Origin to matching origin when in allowed list", () => {
      const response = new NextResponse(null, { status: 200 });
      const origin = "https://trusted.com";
      applyCorsHeaders(response, origin, [
        "https://trusted.com",
        "https://other.com",
      ]);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    });

    it("sets Vary header when origin matches allowed list", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, "https://trusted.com", [
        "https://trusted.com",
      ]);

      expect(response.headers.get("Vary")).toBe("Origin");
    });

    it("does not set Access-Control-Allow-Origin when origin is not in allowed list", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, "https://untrusted.com", [
        "https://trusted.com",
      ]);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("does not set Access-Control-Allow-Origin when requestOrigin is null and allowedOrigins is array", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, null, ["https://trusted.com"]);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("always sets Access-Control-Allow-Methods", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, null, "*");

      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, OPTIONS",
      );
    });

    it("always sets Access-Control-Allow-Headers", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, null, "*");

      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization, X-Widget-Key",
      );
    });

    it("always sets Access-Control-Max-Age to 86400", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, null, "*");

      expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
    });

    it("returns the same response object", () => {
      const response = new NextResponse(null, { status: 200 });
      const result = applyCorsHeaders(response, null, "*");

      expect(result).toBe(response);
    });

    it("sets Methods, Headers, and Max-Age even when origin does not match", () => {
      const response = new NextResponse(null, { status: 200 });
      applyCorsHeaders(response, "https://untrusted.com", [
        "https://trusted.com",
      ]);

      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, OPTIONS",
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization, X-Widget-Key",
      );
      expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
    });
  });

  describe("handleCorsPreflightResponse", () => {
    it("returns a response with status 204", () => {
      const result = handleCorsPreflightResponse(null, "*");
      expect(result.status).toBe(204);
    });

    it("includes CORS headers with wildcard origin", () => {
      const result = handleCorsPreflightResponse("https://example.com", "*");
      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(result.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, OPTIONS",
      );
    });

    it("includes CORS headers with specific allowed origin", () => {
      const origin = "https://trusted.com";
      const result = handleCorsPreflightResponse(origin, [origin]);
      expect(result.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(result.headers.get("Vary")).toBe("Origin");
    });

    it("has null body", () => {
      const result = handleCorsPreflightResponse(null, "*");
      expect(result.body).toBeNull();
    });
  });
});
