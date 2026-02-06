import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isEncrypted,
  ENCRYPTED_FIELDS,
  encryptFields,
  decryptFields,
  decryptFieldsArray,
} from "@/lib/encryption";

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
  });

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
  });

  describe("encryptFields", () => {
    it("should return data unchanged for unknown model", async () => {
      const data = { field1: "value1", field2: "value2" };
      const result = await encryptFields("UnknownModel", data);
      expect(result).toEqual(data);
    });

    it("should not modify non-string fields", async () => {
      const data = { taxId: 12345, phoneNumber: null };
      const result = await encryptFields("User", data);
      expect(result.taxId).toBe(12345);
      expect(result.phoneNumber).toBeNull();
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
  });
});
