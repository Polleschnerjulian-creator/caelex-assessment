/**
 * Sentinel Service Integration Tests (SVA-27)
 *
 * Tests that exercise real crypto functions and Prisma query patterns
 * without mocking. DB-dependent tests skip when DATABASE_URL is not set.
 */
import { describe, it, expect, afterAll } from "vitest";
import { describeIntegration, getTestPrisma, cleanupTestPrisma } from "./setup";
import { createHash, createHmac } from "node:crypto";

// ─── Pure function tests (no DB required) ───

describe("Sentinel crypto functions (no DB)", () => {
  it("HMAC-SHA256 produces consistent hashes", () => {
    const secret = "test-auth-secret";
    const token = "snt_testtoken123";
    const hash1 = createHmac("sha256", secret).update(token).digest("hex");
    const hash2 = createHmac("sha256", secret).update(token).digest("hex");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("HMAC-SHA256 differs from plain SHA-256", () => {
    const secret = "test-auth-secret";
    const token = "snt_testtoken123";
    const hmacHash = createHmac("sha256", secret).update(token).digest("hex");
    const plainHash = createHash("sha256").update(token).digest("hex");
    expect(hmacHash).not.toBe(plainHash);
  });

  it("canonicalize produces deterministic output regardless of key order", () => {
    function canonicalize(value: unknown): string {
      if (value === null || value === undefined) return "null";
      if (typeof value === "string") return JSON.stringify(value);
      if (typeof value === "number" || typeof value === "boolean")
        return String(value);
      if (Array.isArray(value))
        return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
      if (typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).sort();
        const pairs = keys.map(
          (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
        );
        return "{" + pairs.join(",") + "}";
      }
      return String(value);
    }

    const obj1 = { z: 1, a: 2, m: { b: 3, a: 4 } };
    const obj2 = { a: 2, m: { a: 4, b: 3 }, z: 1 };

    expect(canonicalize(obj1)).toBe(canonicalize(obj2));

    const hash1 = createHash("sha256").update(canonicalize(obj1)).digest("hex");
    const hash2 = createHash("sha256").update(canonicalize(obj2)).digest("hex");
    expect(hash1).toBe(hash2);
  });

  it("content hash detects any data modification", () => {
    function computeHash(data: unknown): string {
      function canonicalize(value: unknown): string {
        if (value === null || value === undefined) return "null";
        if (typeof value === "string") return JSON.stringify(value);
        if (typeof value === "number" || typeof value === "boolean")
          return String(value);
        if (Array.isArray(value))
          return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
        if (typeof value === "object") {
          const obj = value as Record<string, unknown>;
          const keys = Object.keys(obj).sort();
          const pairs = keys.map(
            (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
          );
          return "{" + pairs.join(",") + "}";
        }
        return String(value);
      }
      return `sha256:${createHash("sha256").update(canonicalize(data)).digest("hex")}`;
    }

    const original = {
      data: { data_point: "fuel", values: { pct: 85 } },
      regulation_mapping: [{ ref: "art_64", status: "COMPLIANT", note: "" }],
    };
    const tampered = {
      data: { data_point: "fuel", values: { pct: 86 } },
      regulation_mapping: [{ ref: "art_64", status: "COMPLIANT", note: "" }],
    };

    expect(computeHash(original)).not.toBe(computeHash(tampered));
    expect(computeHash(original)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("audit entry hash includes previousHash in chain linkage", () => {
    function computeEntryHash(entry: Record<string, unknown>): string {
      const payload = JSON.stringify(entry);
      return createHash("sha256").update(payload).digest("hex");
    }

    const entry = {
      userId: "user-1",
      action: "test_action",
      entityType: "test",
      entityId: "entity-1",
      timestamp: "2024-01-15T12:00:00.000Z",
      previousHash: "GENESIS",
    };

    const hash1 = computeEntryHash(entry);
    const hash2 = computeEntryHash({ ...entry, previousHash: "different" });

    // Changing previousHash must produce a different entry hash
    expect(hash1).not.toBe(hash2);
  });
});

// ─── DB-dependent tests (skip without DATABASE_URL) ───

describeIntegration("Sentinel DB integration", () => {
  afterAll(async () => {
    await cleanupTestPrisma();
  });

  it("connects to the database", async () => {
    const prisma = getTestPrisma();
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    expect(result).toBeTruthy();
  });

  it("organization.findFirst returns null for nonexistent org", async () => {
    const prisma = getTestPrisma();
    const org = await prisma.organization.findFirst({
      where: { id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(org).toBeNull();
  });

  it("sentinelAgent.findUnique returns null for nonexistent agent", async () => {
    const prisma = getTestPrisma();
    const agent = await prisma.sentinelAgent.findUnique({
      where: { sentinelId: "nonexistent-sentinel-id" },
    });
    expect(agent).toBeNull();
  });
});
