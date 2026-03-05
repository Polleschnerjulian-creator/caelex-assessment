import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSignedToken,
  verifySignedToken,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./signed-token";

describe("signed-token", () => {
  const TEST_SECRET = "test-secret-key-for-hmac-signing-1234";

  beforeEach(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  // ─── createSignedToken ───

  describe("createSignedToken", () => {
    it("returns a string with dot separator", () => {
      const token = createSignedToken({ foo: "bar" });
      expect(typeof token).toBe("string");
      expect(token).toContain(".");
      const parts = token.split(".");
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });

    it("throws when AUTH_SECRET is missing", () => {
      delete process.env.AUTH_SECRET;
      expect(() => createSignedToken({ foo: "bar" })).toThrow(
        "AUTH_SECRET is required for token signing",
      );
    });

    it("includes expiration in payload", () => {
      const token = createSignedToken({ foo: "bar" });
      const data = token.split(".")[0];
      const payload = JSON.parse(
        Buffer.from(data, "base64url").toString("utf-8"),
      );
      expect(payload.exp).toBeDefined();
      expect(typeof payload.exp).toBe("number");
      expect(payload.exp).toBeGreaterThan(Date.now());
    });

    it("supports custom TTL", () => {
      const before = Date.now();
      const token = createSignedToken({ foo: "bar" }, 1000); // 1 second
      const data = token.split(".")[0];
      const payload = JSON.parse(
        Buffer.from(data, "base64url").toString("utf-8"),
      );
      // exp should be roughly now + 1000ms
      expect(payload.exp).toBeGreaterThanOrEqual(before + 1000);
      expect(payload.exp).toBeLessThanOrEqual(before + 1000 + 100);
    });
  });

  // ─── verifySignedToken ───

  describe("verifySignedToken", () => {
    it("returns payload for a valid token", () => {
      const token = createSignedToken({ userId: "123", role: "admin" });
      const result = verifySignedToken<{
        userId: string;
        role: string;
        exp: number;
      }>(token);
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("123");
      expect(result!.role).toBe("admin");
      expect(result!.exp).toBeDefined();
    });

    it("returns null for tampered token", () => {
      const token = createSignedToken({ userId: "123" });
      // Tamper with the data portion
      const parts = token.split(".");
      const tamperedData = Buffer.from(
        JSON.stringify({ userId: "hacked", exp: Date.now() + 300000 }),
      ).toString("base64url");
      const tamperedToken = `${tamperedData}.${parts[1]}`;
      expect(verifySignedToken(tamperedToken)).toBeNull();
    });

    it("returns null for expired token", () => {
      // Create a token that already expired
      const token = createSignedToken({ userId: "123" }, -1000);
      expect(verifySignedToken(token)).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(verifySignedToken("")).toBeNull();
    });

    it("returns null for malformed input", () => {
      expect(verifySignedToken("not-a-valid-token")).toBeNull();
    });

    it("returns null when AUTH_SECRET is missing", () => {
      const token = createSignedToken({ userId: "123" });
      delete process.env.AUTH_SECRET;
      expect(verifySignedToken(token)).toBeNull();
    });

    it("returns null for wrong format (no dot)", () => {
      expect(verifySignedToken("nodothere")).toBeNull();
    });

    it("returns null for truncated signature", () => {
      const token = createSignedToken({ userId: "123" });
      const parts = token.split(".");
      // Use only part of the signature
      const truncated = `${parts[0]}.${parts[1].slice(0, 5)}`;
      expect(verifySignedToken(truncated)).toBeNull();
    });
  });

  // ─── createUnsubscribeToken ───

  describe("createUnsubscribeToken", () => {
    it("returns a string with dot separator", () => {
      const token = createUnsubscribeToken("user@example.com");
      expect(typeof token).toBe("string");
      expect(token).toContain(".");
      const parts = token.split(".");
      expect(parts.length).toBe(2);
    });

    it("throws when AUTH_SECRET is missing", () => {
      delete process.env.AUTH_SECRET;
      expect(() => createUnsubscribeToken("user@example.com")).toThrow(
        "AUTH_SECRET required for unsubscribe tokens",
      );
    });

    it("lowercases email", () => {
      const token1 = createUnsubscribeToken("User@Example.COM");
      const token2 = createUnsubscribeToken("user@example.com");
      expect(token1).toBe(token2);
    });
  });

  // ─── verifyUnsubscribeToken ───

  describe("verifyUnsubscribeToken", () => {
    it("returns email for valid token", () => {
      const token = createUnsubscribeToken("user@example.com");
      const email = verifyUnsubscribeToken(token);
      expect(email).toBe("user@example.com");
    });

    it("returns null for tampered token", () => {
      const token = createUnsubscribeToken("user@example.com");
      const parts = token.split(".");
      const tamperedData = Buffer.from("hacked@evil.com").toString("base64url");
      const tamperedToken = `${tamperedData}.${parts[1]}`;
      expect(verifyUnsubscribeToken(tamperedToken)).toBeNull();
    });

    it("returns null when AUTH_SECRET is missing", () => {
      const token = createUnsubscribeToken("user@example.com");
      delete process.env.AUTH_SECRET;
      expect(verifyUnsubscribeToken(token)).toBeNull();
    });

    it("returns null for malformed input", () => {
      expect(verifyUnsubscribeToken("")).toBeNull();
      expect(verifyUnsubscribeToken("no-dot")).toBeNull();
    });
  });

  // ─── Round-trip ───

  describe("round-trip", () => {
    it("create -> verify returns original payload", () => {
      const original = { userId: "u1", org: "o1", action: "login" };
      const token = createSignedToken(original);
      const result = verifySignedToken<typeof original & { exp: number }>(
        token,
      );
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("u1");
      expect(result!.org).toBe("o1");
      expect(result!.action).toBe("login");
    });

    it("create unsubscribe -> verify returns email", () => {
      const email = "Test.User@Company.org";
      const token = createUnsubscribeToken(email);
      const result = verifyUnsubscribeToken(token);
      expect(result).toBe(email.toLowerCase());
    });
  });
});
