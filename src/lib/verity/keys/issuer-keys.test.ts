import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("../utils/redaction", () => ({ safeLog: vi.fn() }));

import {
  generateIssuerKeyPair,
  decryptPrivateKey,
  getActiveIssuerKey,
  getKeyByKeyId,
} from "./issuer-keys";

describe("issuer-keys", () => {
  const VALID_MASTER_KEY = "a".repeat(64);
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.VERITY_MASTER_KEY;
    process.env.VERITY_MASTER_KEY = VALID_MASTER_KEY;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.VERITY_MASTER_KEY;
    } else {
      process.env.VERITY_MASTER_KEY = originalEnv;
    }
  });

  // ── generateIssuerKeyPair ──────────────────────────────────────────────

  describe("generateIssuerKeyPair", () => {
    it("generates keyId with verity-YYYY-MM-DD format", async () => {
      const result = await generateIssuerKeyPair();
      expect(result.keyId).toMatch(/^verity-\d{4}-\d{2}-\d{2}$/);
    });

    it("returns publicKeyHex and encryptedPrivateKeyHex", async () => {
      const result = await generateIssuerKeyPair();
      expect(result.publicKeyHex).toBeTruthy();
      expect(typeof result.publicKeyHex).toBe("string");
      expect(result.encryptedPrivateKeyHex).toBeTruthy();
      expect(typeof result.encryptedPrivateKeyHex).toBe("string");
      // encryptedPrivateKeyHex has format iv:authTag:ciphertext
      const parts = result.encryptedPrivateKeyHex.split(":");
      expect(parts).toHaveLength(3);
    });

    it("throws when VERITY_MASTER_KEY is missing", async () => {
      delete process.env.VERITY_MASTER_KEY;
      await expect(generateIssuerKeyPair()).rejects.toThrow(
        "VERITY_MASTER_KEY must be 64 hex chars (32 bytes)",
      );
    });

    it("throws when VERITY_MASTER_KEY is wrong length", async () => {
      process.env.VERITY_MASTER_KEY = "abcd";
      await expect(generateIssuerKeyPair()).rejects.toThrow(
        "VERITY_MASTER_KEY must be 64 hex chars (32 bytes)",
      );
    });
  });

  // ── decryptPrivateKey ──────────────────────────────────────────────────

  describe("decryptPrivateKey", () => {
    it("round-trip encrypt then decrypt returns valid DER", async () => {
      const generated = await generateIssuerKeyPair();
      const decrypted = decryptPrivateKey(generated.encryptedPrivateKeyHex);
      expect(Buffer.isBuffer(decrypted)).toBe(true);
      expect(decrypted.length).toBeGreaterThan(0);
    });

    it("throws when VERITY_MASTER_KEY is missing", async () => {
      const generated = await generateIssuerKeyPair();
      delete process.env.VERITY_MASTER_KEY;
      expect(() => decryptPrivateKey(generated.encryptedPrivateKeyHex)).toThrow(
        "VERITY_MASTER_KEY not set",
      );
    });
  });

  // ── getActiveIssuerKey ─────────────────────────────────────────────────

  describe("getActiveIssuerKey", () => {
    it("returns active key from DB", async () => {
      // First generate a real key pair so we have valid encrypted data
      const generated = await generateIssuerKeyPair();

      const mockPrisma = {
        verityIssuerKey: {
          findFirst: vi.fn().mockResolvedValue({
            keyId: generated.keyId,
            publicKeyHex: generated.publicKeyHex,
            encryptedPrivKey: generated.encryptedPrivateKeyHex,
            algorithm: "Ed25519",
            active: true,
          }),
          create: vi.fn(),
        },
      } as unknown as PrismaClient;

      const result = await getActiveIssuerKey(mockPrisma);
      expect(result.keyId).toBe(generated.keyId);
      expect(result.publicKeyHex).toBe(generated.publicKeyHex);
      expect(Buffer.isBuffer(result.privateKeyDer)).toBe(true);
      expect(mockPrisma.verityIssuerKey.findFirst).toHaveBeenCalledWith({
        where: { active: true },
      });
      expect(mockPrisma.verityIssuerKey.create).not.toHaveBeenCalled();
    });

    it("auto-generates when no key exists", async () => {
      const mockPrisma = {
        verityIssuerKey: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(async ({ data }) => ({
            keyId: data.keyId,
            publicKeyHex: data.publicKeyHex,
            encryptedPrivKey: data.encryptedPrivKey,
            algorithm: data.algorithm,
            active: data.active,
          })),
        },
      } as unknown as PrismaClient;

      const result = await getActiveIssuerKey(mockPrisma);
      expect(result.keyId).toMatch(/^verity-\d{4}-\d{2}-\d{2}$/);
      expect(result.publicKeyHex).toBeTruthy();
      expect(Buffer.isBuffer(result.privateKeyDer)).toBe(true);
      expect(mockPrisma.verityIssuerKey.create).toHaveBeenCalled();
    });

    it("decrypts private key", async () => {
      const generated = await generateIssuerKeyPair();

      const mockPrisma = {
        verityIssuerKey: {
          findFirst: vi.fn().mockResolvedValue({
            keyId: generated.keyId,
            publicKeyHex: generated.publicKeyHex,
            encryptedPrivKey: generated.encryptedPrivateKeyHex,
            algorithm: "Ed25519",
            active: true,
          }),
          create: vi.fn(),
        },
      } as unknown as PrismaClient;

      const result = await getActiveIssuerKey(mockPrisma);
      expect(result.privateKeyDer).toBeDefined();
      expect(result.privateKeyDer.length).toBeGreaterThan(0);
    });
  });

  // ── getKeyByKeyId ──────────────────────────────────────────────────────

  describe("getKeyByKeyId", () => {
    it("returns publicKeyHex when found", async () => {
      const mockPrisma = {
        verityIssuerKey: {
          findFirst: vi.fn().mockResolvedValue({
            keyId: "verity-2026-01-01",
            publicKeyHex: "deadbeef",
          }),
        },
      } as unknown as PrismaClient;

      const result = await getKeyByKeyId(mockPrisma, "verity-2026-01-01");
      expect(result).toEqual({ publicKeyHex: "deadbeef" });
      expect(mockPrisma.verityIssuerKey.findFirst).toHaveBeenCalledWith({
        where: { keyId: "verity-2026-01-01" },
      });
    });

    it("returns null when not found", async () => {
      const mockPrisma = {
        verityIssuerKey: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as unknown as PrismaClient;

      const result = await getKeyByKeyId(mockPrisma, "nonexistent");
      expect(result).toBeNull();
    });
  });
});
