import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Monkey-patch Node's crypto.scrypt to include maxmem for OWASP scrypt params
// Must happen before encryption module is imported (it caches the derived key)
vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const originalScrypt = crypto.scrypt;
  crypto.scrypt = function patchedScrypt(
    password: any,
    salt: any,
    keylen: number,
    ...rest: any[]
  ) {
    if (rest.length === 1 && typeof rest[0] === "function") {
      return originalScrypt.call(crypto, password, salt, keylen, rest[0]);
    }
    const [options, cb] = rest;
    const patchedOptions = { ...options, maxmem: 128 * 1024 * 1024 };
    return originalScrypt.call(
      crypto,
      password,
      salt,
      keylen,
      patchedOptions,
      cb,
    );
  };
});

// Set env vars BEFORE importing encryption module (key derivation cache)
const TEST_KEY =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const TEST_SALT = "0123456789abcdef0123456789abcdef";
process.env.ENCRYPTION_KEY = TEST_KEY;
process.env.ENCRYPTION_SALT = TEST_SALT;

import {
  encrypt,
  decrypt,
  isEncrypted,
  hashForSearch,
  encryptForOrg,
  decryptForOrg,
  isOrgEncrypted,
  smartDecrypt,
  ENCRYPTED_FIELDS,
  encryptFields,
  decryptFields,
  decryptFieldsArray,
  encryptFieldsForOrg,
  decryptFieldsSmart,
  decryptFieldsArraySmart,
  migrateToOrgEncryption,
} from "@/lib/encryption";

// ═══════════════════════════════════════════════════════════════
// isEncrypted
// ═══════════════════════════════════════════════════════════════

describe("Encryption Module", () => {
  describe("isEncrypted", () => {
    it("should return false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isEncrypted(null as unknown as string)).toBe(false);
      expect(isEncrypted(undefined as unknown as string)).toBe(false);
    });

    it("should return false for non-encrypted text", () => {
      expect(isEncrypted("plain text")).toBe(false);
      expect(isEncrypted("some:text")).toBe(false);
    });

    it("should return true for valid encrypted format", () => {
      // IV is 16 bytes = 32 hex chars
      const validFormat = `${"a".repeat(32)}:${"b".repeat(32)}:encrypted`;
      expect(isEncrypted(validFormat)).toBe(true);
    });

    it("should return false for invalid IV length", () => {
      const invalidFormat = `${"a".repeat(16)}:${"b".repeat(32)}:encrypted`;
      expect(isEncrypted(invalidFormat)).toBe(false);
    });

    it("should return false for format with only two colons but wrong IV", () => {
      expect(isEncrypted("short:medium:data")).toBe(false);
    });

    it("should return false for format with more than 3 parts", () => {
      expect(
        isEncrypted(`${"a".repeat(32)}:${"b".repeat(32)}:data:extra`),
      ).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // isOrgEncrypted
  // ═══════════════════════════════════════════════════════════════

  describe("isOrgEncrypted", () => {
    it("should return false for empty string", () => {
      expect(isOrgEncrypted("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isOrgEncrypted(null as unknown as string)).toBe(false);
      expect(isOrgEncrypted(undefined as unknown as string)).toBe(false);
    });

    it("should return false for regular encrypted text", () => {
      const regularEncrypted = `${"a".repeat(32)}:${"b".repeat(32)}:encrypted`;
      expect(isOrgEncrypted(regularEncrypted)).toBe(false);
    });

    it("should return true for org-prefixed text", () => {
      expect(isOrgEncrypted("org:some-org-id:iv:authTag:data")).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(isOrgEncrypted("plain text")).toBe(false);
    });

    it("should return true for minimal org prefix", () => {
      expect(isOrgEncrypted("org:x")).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Encrypt / Decrypt Roundtrip
  // ═══════════════════════════════════════════════════════════════

  describe("encrypt and decrypt roundtrip", () => {
    it("should encrypt and decrypt a simple string", async () => {
      const plaintext = "Hello, World!";
      const encrypted = await encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should return empty/falsy input unchanged for encrypt", async () => {
      const result = await encrypt("");
      expect(result).toBe("");
    });

    it("should return empty/falsy input unchanged for decrypt", async () => {
      const result = await decrypt("");
      expect(result).toBe("");
    });

    it("should return non-colon text unchanged for decrypt", async () => {
      const result = await decrypt("plain text without colons");
      expect(result).toBe("plain text without colons");
    });

    it("should produce different ciphertexts for same plaintext (random IV)", async () => {
      const plaintext = "test data";
      const encrypted1 = await encrypt(plaintext);
      const encrypted2 = await encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to the same value
      expect(await decrypt(encrypted1)).toBe(plaintext);
      expect(await decrypt(encrypted2)).toBe(plaintext);
    });

    it("should handle unicode characters", async () => {
      const plaintext = "Hallo Welt!";
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", async () => {
      const plaintext = "VAT: DE123456789 <script>alert('xss')</script>";
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle very long strings", async () => {
      const plaintext = "x".repeat(10000);
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle single character", async () => {
      const encrypted = await encrypt("A");
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe("A");
    });

    it("should handle JSON data", async () => {
      const json = JSON.stringify({
        key: "value",
        nested: { arr: [1, 2, 3] },
      });
      const encrypted = await encrypt(json);
      const decrypted = await decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual({
        key: "value",
        nested: { arr: [1, 2, 3] },
      });
    });

    it("should handle newlines and tabs", async () => {
      const plaintext = "line1\nline2\ttab";
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle emoji characters", async () => {
      const plaintext = "rocket: \u{1F680} star: \u2B50";
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Decrypt Error Cases
  // ═══════════════════════════════════════════════════════════════

  describe("decrypt error cases", () => {
    it("should throw for invalid encrypted text format (wrong number of parts)", async () => {
      await expect(decrypt("a:b")).rejects.toThrow(
        "Invalid encrypted text format",
      );
    });

    it("should throw for four-part format", async () => {
      await expect(decrypt("a:b:c:d")).rejects.toThrow(
        "Invalid encrypted text format",
      );
    });

    it("should throw for invalid IV length", async () => {
      await expect(
        decrypt(`${"a".repeat(10)}:${"b".repeat(32)}:data`),
      ).rejects.toThrow("Invalid IV length");
    });

    it("should throw for invalid auth tag length", async () => {
      await expect(
        decrypt(`${"a".repeat(32)}:${"b".repeat(10)}:data`),
      ).rejects.toThrow("Invalid auth tag length");
    });

    it("should throw for tampered ciphertext", async () => {
      const encrypted = await encrypt("test data");
      const parts = encrypted.split(":");
      parts[2] = "ff".repeat(20); // Replace ciphertext with invalid data
      const tampered = parts.join(":");

      await expect(decrypt(tampered)).rejects.toThrow();
    });

    it("should throw for tampered auth tag", async () => {
      const encrypted = await encrypt("test data");
      const parts = encrypted.split(":");
      // Replace auth tag with wrong value
      parts[1] = "00".repeat(16);
      const tampered = parts.join(":");

      await expect(decrypt(tampered)).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Per-Organization Encryption
  // ═══════════════════════════════════════════════════════════════

  describe("per-organization encryption", () => {
    it("should encrypt and decrypt for a specific organization", async () => {
      const plaintext = "Organization secret data";
      const orgId = "org-test-123";

      const encrypted = await encryptForOrg(plaintext, orgId);
      expect(encrypted.startsWith("org:")).toBe(true);
      expect(isOrgEncrypted(encrypted)).toBe(true);

      const decrypted = await decryptForOrg(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should return empty/falsy input unchanged for encryptForOrg", async () => {
      const result = await encryptForOrg("", "org-id");
      expect(result).toBe("");
    });

    it("should return empty/falsy input unchanged for decryptForOrg", async () => {
      const result = await decryptForOrg("");
      expect(result).toBe("");
    });

    it("should throw when organizationId is missing", async () => {
      await expect(encryptForOrg("test", "")).rejects.toThrow(
        "organizationId is required",
      );
    });

    it("should produce different ciphertexts for different organizations", async () => {
      const plaintext = "same data";
      const encrypted1 = await encryptForOrg(plaintext, "org-1");
      const encrypted2 = await encryptForOrg(plaintext, "org-2");

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should embed organizationId in the encrypted string", async () => {
      const orgId = "org-embed-test";
      const encrypted = await encryptForOrg("test", orgId);

      expect(encrypted).toContain(`org:${orgId}:`);
    });

    it("should throw for non-org-encrypted data passed to decryptForOrg", async () => {
      const regularEncrypted = await encrypt("test");
      await expect(decryptForOrg(regularEncrypted)).rejects.toThrow(
        "expected org-encrypted data",
      );
    });

    it("should throw for invalid org-encrypted format (too few parts)", async () => {
      await expect(decryptForOrg("org:bad-format")).rejects.toThrow(
        "Invalid org-encrypted text format",
      );
    });

    it("should not decrypt org-encrypted data with wrong org key", async () => {
      const plaintext = "secret";
      const encrypted = await encryptForOrg(plaintext, "org-correct");

      // Tamper the org id in the encrypted string
      const tampered = encrypted.replace("org:org-correct:", "org:org-wrong:");
      await expect(decryptForOrg(tampered)).rejects.toThrow();
    });

    it("should handle long organization IDs", async () => {
      const orgId = "org-" + "a".repeat(200);
      const encrypted = await encryptForOrg("test", orgId);
      const decrypted = await decryptForOrg(encrypted);
      expect(decrypted).toBe("test");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Smart Decrypt
  // ═══════════════════════════════════════════════════════════════

  describe("smartDecrypt", () => {
    it("should return empty/falsy input unchanged", async () => {
      expect(await smartDecrypt("")).toBe("");
    });

    it("should decrypt regular encrypted data", async () => {
      const encrypted = await encrypt("regular data");
      const result = await smartDecrypt(encrypted);
      expect(result).toBe("regular data");
    });

    it("should decrypt org-encrypted data", async () => {
      const encrypted = await encryptForOrg("org data", "org-smart-test");
      const result = await smartDecrypt(encrypted);
      expect(result).toBe("org data");
    });

    it("should return non-encrypted text as-is", async () => {
      const result = await smartDecrypt("plain text");
      expect(result).toBe("plain text");
    });

    it("should handle null-ish values", async () => {
      expect(await smartDecrypt(null as unknown as string)).toBe(null);
      expect(await smartDecrypt(undefined as unknown as string)).toBe(
        undefined,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Hash for Search
  // ═══════════════════════════════════════════════════════════════

  describe("hashForSearch", () => {
    it("should produce consistent hash for same input", async () => {
      const hash1 = await hashForSearch("test data");
      const hash2 = await hashForSearch("test data");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await hashForSearch("data1");
      const hash2 = await hashForSearch("data2");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce 64-character hex string", async () => {
      const hash = await hashForSearch("test");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle empty string", async () => {
      const hash = await hashForSearch("");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ENCRYPTED_FIELDS
  // ═══════════════════════════════════════════════════════════════

  describe("ENCRYPTED_FIELDS", () => {
    it("should define User encrypted fields", () => {
      expect(ENCRYPTED_FIELDS.User).toContain("taxId");
      expect(ENCRYPTED_FIELDS.User).toContain("phoneNumber");
    });

    it("should define Organization encrypted fields", () => {
      expect(ENCRYPTED_FIELDS.Organization).toContain("vatNumber");
      expect(ENCRYPTED_FIELDS.Organization).toContain("bankAccount");
      expect(ENCRYPTED_FIELDS.Organization).toContain("taxId");
    });

    it("should define InsuranceAssessment encrypted fields", () => {
      expect(ENCRYPTED_FIELDS.InsuranceAssessment).toContain("policyNumber");
    });

    it("should define EnvironmentalAssessment encrypted fields", () => {
      expect(ENCRYPTED_FIELDS.EnvironmentalAssessment).toContain(
        "internalNotes",
      );
    });

    it("should define Incident encrypted fields", () => {
      expect(ENCRYPTED_FIELDS.Incident).toBeDefined();
      expect(Array.isArray(ENCRYPTED_FIELDS.Incident)).toBe(true);
    });

    it("should define SupervisionReport encrypted fields", () => {
      expect(ENCRYPTED_FIELDS.SupervisionReport).toBeDefined();
      expect(Array.isArray(ENCRYPTED_FIELDS.SupervisionReport)).toBe(true);
    });

    it("should not have empty arrays for defined models", () => {
      for (const [model, fields] of Object.entries(ENCRYPTED_FIELDS)) {
        expect(
          fields.length,
          `${model} should have at least one encrypted field`,
        ).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Field Encryption Helpers
  // ═══════════════════════════════════════════════════════════════

  describe("encryptFields", () => {
    it("should return data unchanged for unknown model", async () => {
      const data = { field1: "value1", field2: "value2" };
      const result = await encryptFields("UnknownModel", data);
      expect(result).toEqual(data);
    });

    it("should encrypt string fields defined in ENCRYPTED_FIELDS", async () => {
      const data = {
        taxId: "DE123456789",
        phoneNumber: "+49123456",
        name: "Alice",
      };
      const result = await encryptFields("User", data);

      expect(result.name).toBe("Alice"); // Not in ENCRYPTED_FIELDS
      expect(isEncrypted(result.taxId as string)).toBe(true);
      expect(isEncrypted(result.phoneNumber as string)).toBe(true);
    });

    it("should not modify non-string fields", async () => {
      const data = { taxId: 12345, phoneNumber: null };
      const result = await encryptFields("User", data);
      expect(result.taxId).toBe(12345);
      expect(result.phoneNumber).toBeNull();
    });

    it("should not modify undefined fields", async () => {
      const data = { name: "Alice" };
      const result = await encryptFields("User", data);
      expect(result.name).toBe("Alice");
      expect((result as Record<string, unknown>).taxId).toBeUndefined();
    });

    it("should encrypt already encrypted values again (no double-encrypt guard)", async () => {
      const data = { taxId: "DE123456789" };
      const firstPass = await encryptFields("User", data);
      const secondPass = await encryptFields("User", firstPass);

      // encryptFields does not check isEncrypted, so double-encryption occurs
      expect(isEncrypted(firstPass.taxId as string)).toBe(true);
      expect(isEncrypted(secondPass.taxId as string)).toBe(true);
      // The second pass produces a different ciphertext (it encrypts the encrypted value)
      expect(firstPass.taxId).not.toBe(secondPass.taxId);
    });
  });

  describe("decryptFields", () => {
    it("should return data unchanged for unknown model", async () => {
      const data = { field1: "value1", field2: "value2" };
      const result = await decryptFields("UnknownModel", data);
      expect(result).toEqual(data);
    });

    it("should not modify non-encrypted fields", async () => {
      const data = { taxId: "plain-text", phoneNumber: "123456" };
      const result = await decryptFields("User", data);
      expect(result.taxId).toBe("plain-text");
      expect(result.phoneNumber).toBe("123456");
    });

    it("should decrypt encrypted fields", async () => {
      const original = {
        taxId: "DE123456789",
        phoneNumber: "+49123456",
        name: "Alice",
      };
      const encrypted = await encryptFields("User", original);
      const decrypted = await decryptFields("User", encrypted);

      expect(decrypted.taxId).toBe("DE123456789");
      expect(decrypted.phoneNumber).toBe("+49123456");
      expect(decrypted.name).toBe("Alice");
    });

    it("should handle null values in fields", async () => {
      const data = { taxId: null, phoneNumber: null, name: "Alice" };
      const result = await decryptFields("User", data);
      expect(result.taxId).toBeNull();
      expect(result.phoneNumber).toBeNull();
    });
  });

  describe("decryptFieldsArray", () => {
    it("should process empty array", async () => {
      const result = await decryptFieldsArray("User", []);
      expect(result).toEqual([]);
    });

    it("should process array of items", async () => {
      const data = [
        { taxId: "value1", name: "User 1" },
        { taxId: "value2", name: "User 2" },
      ];
      const result = await decryptFieldsArray("User", data);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("User 1");
      expect(result[1].name).toBe("User 2");
    });

    it("should decrypt encrypted items in array", async () => {
      const original = [
        { taxId: "ID001", name: "User 1" },
        { taxId: "ID002", name: "User 2" },
      ];
      const encrypted = await Promise.all(
        original.map((item) => encryptFields("User", item)),
      );
      const decrypted = await decryptFieldsArray("User", encrypted);

      expect(decrypted[0].taxId).toBe("ID001");
      expect(decrypted[1].taxId).toBe("ID002");
    });

    it("should handle single item array", async () => {
      const result = await decryptFieldsArray("User", [
        { taxId: "plain", name: "Solo" },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Solo");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Per-Org Field Helpers
  // ═══════════════════════════════════════════════════════════════

  describe("encryptFieldsForOrg", () => {
    it("should encrypt fields with per-org key", async () => {
      const data = { vatNumber: "NL123456789B01", name: "Acme Space" };
      const result = await encryptFieldsForOrg("Organization", data, "org-123");

      expect(result.name).toBe("Acme Space");
      expect(isOrgEncrypted(result.vatNumber as string)).toBe(true);
    });

    it("should return data unchanged for unknown model", async () => {
      const data = { field: "value" };
      const result = await encryptFieldsForOrg("UnknownModel", data, "org-123");
      expect(result).toEqual(data);
    });

    it("should not modify non-string fields", async () => {
      const data = { vatNumber: null, bankAccount: 12345 };
      const result = await encryptFieldsForOrg("Organization", data, "org-123");
      expect(result.vatNumber).toBeNull();
      expect(result.bankAccount).toBe(12345);
    });
  });

  describe("decryptFieldsSmart", () => {
    it("should decrypt regular encrypted fields", async () => {
      const original = { taxId: "DE123", name: "Alice" };
      const encrypted = await encryptFields("User", original);
      const result = await decryptFieldsSmart("User", encrypted);
      expect(result.taxId).toBe("DE123");
    });

    it("should decrypt org-encrypted fields", async () => {
      const original = { vatNumber: "NL123", name: "Acme" };
      const encrypted = await encryptFieldsForOrg(
        "Organization",
        original,
        "org-1",
      );
      const result = await decryptFieldsSmart("Organization", encrypted);
      expect(result.vatNumber).toBe("NL123");
    });

    it("should handle plain text fields", async () => {
      const data = { taxId: "plain-text", name: "Alice" };
      const result = await decryptFieldsSmart("User", data);
      expect(result.taxId).toBe("plain-text");
    });
  });

  describe("decryptFieldsArraySmart", () => {
    it("should process empty array", async () => {
      const result = await decryptFieldsArraySmart("User", []);
      expect(result).toEqual([]);
    });

    it("should decrypt array of items with mixed encryption", async () => {
      const item1 = { taxId: await encrypt("ID1"), name: "User 1" };
      const item2 = { taxId: "plain", name: "User 2" };
      const result = await decryptFieldsArraySmart("User", [item1, item2]);

      expect(result[0].taxId).toBe("ID1");
      expect(result[1].taxId).toBe("plain");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Migration
  // ═══════════════════════════════════════════════════════════════

  describe("migrateToOrgEncryption", () => {
    it("should return empty input unchanged", async () => {
      const result = await migrateToOrgEncryption("", "org-1");
      expect(result).toBe("");
    });

    it("should skip already org-encrypted data", async () => {
      const orgEncrypted = await encryptForOrg("data", "org-1");
      const result = await migrateToOrgEncryption(orgEncrypted, "org-1");
      expect(result).toBe(orgEncrypted);
    });

    it("should re-encrypt legacy encrypted data to org encryption", async () => {
      const legacyEncrypted = await encrypt("secret data");
      const migrated = await migrateToOrgEncryption(
        legacyEncrypted,
        "org-migrate",
      );

      expect(isOrgEncrypted(migrated)).toBe(true);
      const decrypted = await decryptForOrg(migrated);
      expect(decrypted).toBe("secret data");
    });

    it("should encrypt unencrypted plain text to org encryption", async () => {
      const migrated = await migrateToOrgEncryption("plain data", "org-new");

      expect(isOrgEncrypted(migrated)).toBe(true);
      const decrypted = await decryptForOrg(migrated);
      expect(decrypted).toBe("plain data");
    });
  });
});
