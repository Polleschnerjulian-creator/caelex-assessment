import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  generateSignature,
  verifySignature,
  generateSigningSecret,
  extractRequestDetails,
} from "@/lib/hmac-signing.server";

describe("HMAC Signing Service", () => {
  const SECRET = "a".repeat(64);
  const METHOD = "POST";
  const PATH = "/api/v1/compliance/assess";
  const BODY = JSON.stringify({ operatorType: "SCO", entitySize: "large" });

  describe("generateSignature", () => {
    it("should return a string in the format t=<timestamp>,v1=<hmac>", () => {
      const sig = generateSignature(SECRET, METHOD, PATH, BODY, 1700000000);
      expect(sig).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    });

    it("should embed the provided timestamp", () => {
      const ts = 1700000000;
      const sig = generateSignature(SECRET, METHOD, PATH, BODY, ts);
      expect(sig.startsWith(`t=${ts},`)).toBe(true);
    });

    it("should use current time when no timestamp is provided", () => {
      const before = Math.floor(Date.now() / 1000);
      const sig = generateSignature(SECRET, METHOD, PATH, BODY);
      const after = Math.floor(Date.now() / 1000);

      const tsStr = sig.split(",")[0].split("=")[1];
      const ts = parseInt(tsStr, 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it("should be deterministic with the same inputs", () => {
      const ts = 1700000000;
      const sig1 = generateSignature(SECRET, METHOD, PATH, BODY, ts);
      const sig2 = generateSignature(SECRET, METHOD, PATH, BODY, ts);
      expect(sig1).toBe(sig2);
    });

    it("should produce different signatures for different secrets", () => {
      const ts = 1700000000;
      const sig1 = generateSignature(SECRET, METHOD, PATH, BODY, ts);
      const sig2 = generateSignature("b".repeat(64), METHOD, PATH, BODY, ts);
      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different methods", () => {
      const ts = 1700000000;
      const sig1 = generateSignature(SECRET, "GET", PATH, BODY, ts);
      const sig2 = generateSignature(SECRET, "POST", PATH, BODY, ts);
      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different paths", () => {
      const ts = 1700000000;
      const sig1 = generateSignature(SECRET, METHOD, "/api/v1/a", BODY, ts);
      const sig2 = generateSignature(SECRET, METHOD, "/api/v1/b", BODY, ts);
      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different bodies", () => {
      const ts = 1700000000;
      const sig1 = generateSignature(SECRET, METHOD, PATH, '{"a":1}', ts);
      const sig2 = generateSignature(SECRET, METHOD, PATH, '{"b":2}', ts);
      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different timestamps", () => {
      const sig1 = generateSignature(SECRET, METHOD, PATH, BODY, 1700000000);
      const sig2 = generateSignature(SECRET, METHOD, PATH, BODY, 1700000001);
      expect(sig1).not.toBe(sig2);
    });

    it("should handle null body", () => {
      const ts = 1700000000;
      const sig = generateSignature(SECRET, METHOD, PATH, null, ts);
      expect(sig).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    });

    it("should handle empty string body same as null body", () => {
      const ts = 1700000000;
      const sig1 = generateSignature(SECRET, METHOD, PATH, null, ts);
      const sig2 = generateSignature(SECRET, METHOD, PATH, "", ts);
      expect(sig1).toBe(sig2);
    });

    it("should normalize method to uppercase in the signature payload", () => {
      const ts = 1700000000;
      const sig1 = generateSignature(SECRET, "post", PATH, BODY, ts);
      const sig2 = generateSignature(SECRET, "POST", PATH, BODY, ts);
      expect(sig1).toBe(sig2);
    });
  });

  describe("verifySignature", () => {
    function makeValidSignature(
      overrides: {
        secret?: string;
        method?: string;
        path?: string;
        body?: string | null;
        ts?: number;
      } = {},
    ) {
      const ts = overrides.ts ?? Math.floor(Date.now() / 1000);
      const secret = overrides.secret ?? SECRET;
      const method = overrides.method ?? METHOD;
      const path = overrides.path ?? PATH;
      const body = overrides.body !== undefined ? overrides.body : BODY;
      const header = generateSignature(secret, method, path, body, ts);
      return { header, ts, secret, method, path, body };
    }

    it("should return valid for a correct signature", () => {
      const { header, secret, method, path, body } = makeValidSignature();
      const result = verifySignature(header, secret, method, path, body);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.timestamp).toBeDefined();
      expect(result.age).toBeDefined();
      expect(result.age).toBeGreaterThanOrEqual(0);
    });

    it("should return valid with age of 0 for a just-created signature", () => {
      const { header, secret, method, path, body } = makeValidSignature();
      const result = verifySignature(header, secret, method, path, body);
      expect(result.valid).toBe(true);
      expect(result.age).toBeLessThanOrEqual(1);
    });

    it("should fail when signature header is null", () => {
      const result = verifySignature(null, SECRET, METHOD, PATH, BODY);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing X-Signature header");
    });

    it("should fail when signature header is empty string", () => {
      const result = verifySignature("", SECRET, METHOD, PATH, BODY);
      expect(result.valid).toBe(false);
      // Empty string is falsy, so it hits the null/missing check first
      expect(result.error).toBe("Missing X-Signature header");
    });

    it("should fail for invalid signature format — no v1 component", () => {
      const ts = Math.floor(Date.now() / 1000);
      const result = verifySignature(`t=${ts}`, SECRET, METHOD, PATH, BODY);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature format");
    });

    it("should fail for invalid signature format — no t component", () => {
      const result = verifySignature(
        "v1=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        SECRET,
        METHOD,
        PATH,
        BODY,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature format");
    });

    it("should fail for invalid signature format — garbage string", () => {
      const result = verifySignature(
        "totally-invalid-header",
        SECRET,
        METHOD,
        PATH,
        BODY,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature format");
    });

    it("should fail for invalid signature format — non-numeric timestamp", () => {
      const result = verifySignature(
        "t=abc,v1=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        SECRET,
        METHOD,
        PATH,
        BODY,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature format");
    });

    it("should fail when the signing secret is wrong", () => {
      const { header, method, path, body } = makeValidSignature();
      const result = verifySignature(
        header,
        "wrong-secret-" + "x".repeat(51),
        method,
        path,
        body,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("should fail when the body has been tampered with", () => {
      const { header, secret, method, path } = makeValidSignature();
      const tamperedBody = JSON.stringify({
        operatorType: "EVIL",
        hacked: true,
      });
      const result = verifySignature(
        header,
        secret,
        method,
        path,
        tamperedBody,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("should fail when the method has been changed", () => {
      const { header, secret, path, body } = makeValidSignature({
        method: "POST",
      });
      const result = verifySignature(header, secret, "DELETE", path, body);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("should fail when the path has been changed", () => {
      const { header, secret, method, body } = makeValidSignature();
      const result = verifySignature(
        header,
        secret,
        method,
        "/api/v1/admin/delete-everything",
        body,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    // --- Timestamp validation ---

    it("should fail when the timestamp is before MIN_TIMESTAMP (Jan 1 2024)", () => {
      // Use a timestamp from 2020 — well before the minimum
      const ancientTs = 1577836800; // Jan 1, 2020
      const { header, secret, method, path, body } = makeValidSignature({
        ts: ancientTs,
      });
      const result = verifySignature(header, secret, method, path, body);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Timestamp too old");
      expect(result.timestamp).toBe(ancientTs);
    });

    it("should fail when the timestamp is far in the future (>60s clock drift)", () => {
      const futureTs = Math.floor(Date.now() / 1000) + 120;
      const { header, secret, method, path, body } = makeValidSignature({
        ts: futureTs,
      });
      const result = verifySignature(header, secret, method, path, body);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Timestamp in the future");
      expect(result.timestamp).toBe(futureTs);
    });

    it("should succeed when the timestamp is slightly in the future (within 60s tolerance)", () => {
      const nearFutureTs = Math.floor(Date.now() / 1000) + 30;
      const { header, secret, method, path, body } = makeValidSignature({
        ts: nearFutureTs,
      });
      const result = verifySignature(header, secret, method, path, body);
      expect(result.valid).toBe(true);
    });

    it("should fail when the signature has expired (>300s old)", () => {
      const expiredTs = Math.floor(Date.now() / 1000) - 400;
      const { header, secret, method, path, body } = makeValidSignature({
        ts: expiredTs,
      });
      const result = verifySignature(header, secret, method, path, body);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Signature expired/);
      expect(result.error).toContain("max 300s");
      expect(result.timestamp).toBe(expiredTs);
      expect(result.age).toBeGreaterThan(300);
    });

    it("should succeed when the signature is within the 300s window", () => {
      const recentTs = Math.floor(Date.now() / 1000) - 100;
      const { header, secret, method, path, body } = makeValidSignature({
        ts: recentTs,
      });
      const result = verifySignature(header, secret, method, path, body);
      expect(result.valid).toBe(true);
      expect(result.age).toBeGreaterThanOrEqual(100);
      expect(result.age).toBeLessThanOrEqual(101);
    });

    it("should fail for a replayed signature past the window", () => {
      // Simulate signing a request now...
      const { header, secret, method, path, body, ts } = makeValidSignature();

      // ...then verify it immediately (should pass)
      const firstResult = verifySignature(header, secret, method, path, body);
      expect(firstResult.valid).toBe(true);

      // Now simulate time passing beyond the window by creating a signature
      // with an old timestamp
      const oldTs = Math.floor(Date.now() / 1000) - 301;
      const oldHeader = generateSignature(secret, method, path, body, oldTs);
      const replayResult = verifySignature(
        oldHeader,
        secret,
        method,
        path,
        body,
      );
      expect(replayResult.valid).toBe(false);
      expect(replayResult.error).toMatch(/Signature expired/);
    });

    it("should handle verification with null body", () => {
      const { header, secret, method, path } = makeValidSignature({
        body: null,
      });
      const result = verifySignature(header, secret, method, path, null);
      expect(result.valid).toBe(true);
    });

    it("should handle verification with empty string body", () => {
      const { header, secret, method, path } = makeValidSignature({
        body: "",
      });
      const result = verifySignature(header, secret, method, path, "");
      expect(result.valid).toBe(true);
    });
  });

  describe("generateSigningSecret", () => {
    it("should return a 64-character hex string", () => {
      const secret = generateSigningSecret();
      expect(secret).toHaveLength(64);
      expect(secret).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should generate unique secrets each time", () => {
      const secrets = new Set<string>();
      for (let i = 0; i < 100; i++) {
        secrets.add(generateSigningSecret());
      }
      expect(secrets.size).toBe(100);
    });

    it("should return a valid string usable as a signing secret", () => {
      const secret = generateSigningSecret();
      const ts = Math.floor(Date.now() / 1000);
      const sig = generateSignature(secret, "GET", "/test", null, ts);
      const result = verifySignature(sig, secret, "GET", "/test", null);
      expect(result.valid).toBe(true);
    });
  });

  describe("extractRequestDetails", () => {
    it("should extract method, path, body, and signatureHeader from a POST request", async () => {
      const body = JSON.stringify({ test: true });
      const request = new Request("https://example.com/api/v1/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": "t=123,v1=abc",
        },
        body,
      });

      const details = await extractRequestDetails(request);
      expect(details.method).toBe("POST");
      expect(details.path).toBe("/api/v1/test");
      expect(details.body).toBe(body);
      expect(details.signatureHeader).toBe("t=123,v1=abc");
    });

    it("should return null body for GET requests", async () => {
      const request = new Request("https://example.com/api/v1/test", {
        method: "GET",
        headers: {
          "X-Signature": "t=123,v1=abc",
        },
      });

      const details = await extractRequestDetails(request);
      expect(details.method).toBe("GET");
      expect(details.path).toBe("/api/v1/test");
      expect(details.body).toBeNull();
      expect(details.signatureHeader).toBe("t=123,v1=abc");
    });

    it("should return null body for DELETE requests", async () => {
      const request = new Request("https://example.com/api/v1/resource/123", {
        method: "DELETE",
        headers: {
          "X-Signature": "t=456,v1=def",
        },
      });

      const details = await extractRequestDetails(request);
      expect(details.method).toBe("DELETE");
      expect(details.path).toBe("/api/v1/resource/123");
      expect(details.body).toBeNull();
    });

    it("should extract body for PUT requests", async () => {
      const body = JSON.stringify({ updated: "data" });
      const request = new Request("https://example.com/api/v1/resource/123", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": "t=789,v1=ghi",
        },
        body,
      });

      const details = await extractRequestDetails(request);
      expect(details.method).toBe("PUT");
      expect(details.body).toBe(body);
    });

    it("should extract body for PATCH requests", async () => {
      const body = JSON.stringify({ patched: "field" });
      const request = new Request("https://example.com/api/v1/resource/123", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": "t=999,v1=jkl",
        },
        body,
      });

      const details = await extractRequestDetails(request);
      expect(details.method).toBe("PATCH");
      expect(details.body).toBe(body);
    });

    it("should return null signatureHeader when X-Signature is not present", async () => {
      const request = new Request("https://example.com/api/v1/test", {
        method: "GET",
      });

      const details = await extractRequestDetails(request);
      expect(details.signatureHeader).toBeNull();
    });

    it("should extract only the pathname, not query parameters", async () => {
      const request = new Request(
        "https://example.com/api/v1/test?foo=bar&baz=qux",
        {
          method: "GET",
        },
      );

      const details = await extractRequestDetails(request);
      expect(details.path).toBe("/api/v1/test");
    });

    it("should work end-to-end with generateSignature and verifySignature", async () => {
      const secret = generateSigningSecret();
      const bodyContent = JSON.stringify({ operatorType: "SCO" });
      const ts = Math.floor(Date.now() / 1000);

      // Generate signature for the request
      const signatureHeader = generateSignature(
        secret,
        "POST",
        "/api/v1/compliance/assess",
        bodyContent,
        ts,
      );

      // Build a Request with that signature
      const request = new Request(
        "https://example.com/api/v1/compliance/assess",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Signature": signatureHeader,
          },
          body: bodyContent,
        },
      );

      // Extract details as middleware would
      const details = await extractRequestDetails(request);

      // Verify the signature
      const result = verifySignature(
        details.signatureHeader,
        secret,
        details.method,
        details.path,
        details.body,
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
