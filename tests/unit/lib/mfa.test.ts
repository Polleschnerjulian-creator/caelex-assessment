import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    mfaConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock encryption
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => Promise.resolve(v)),
  decrypt: vi.fn((v: string) => Promise.resolve(v)),
  isEncrypted: vi.fn(() => false),
}));

// Mock qrcode
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(() =>
      Promise.resolve("data:image/png;base64,MOCK_QR_CODE"),
    ),
  },
}));

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import {
  generateTotpSecret,
  generateQrCodeDataUrl,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCodes,
  verifyAndConsumeBackupCode,
  countRemainingBackupCodes,
  setupMfa,
  verifyMfaSetup,
  validateMfaCode,
  hasMfaEnabled,
  getMfaStatus,
  disableMfa,
  regenerateBackupCodes,
} from "@/lib/mfa.server";

describe("MFA Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // generateTotpSecret
  // ---------------------------------------------------------------------------
  describe("generateTotpSecret", () => {
    it("should return a base32-encoded string", () => {
      const secret = generateTotpSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe("string");
      // Base32 characters: A-Z, 2-7, and = for padding
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    });

    it("should generate unique secrets on each call", () => {
      const secret1 = generateTotpSecret();
      const secret2 = generateTotpSecret();
      expect(secret1).not.toBe(secret2);
    });

    it("should generate a secret of sufficient length for SHA256 (32 bytes / 256 bits)", () => {
      const secret = generateTotpSecret();
      // 32 bytes in base32 = ~52 characters
      expect(secret.length).toBeGreaterThanOrEqual(52);
    });
  });

  // ---------------------------------------------------------------------------
  // verifyTotpCode
  // ---------------------------------------------------------------------------
  describe("verifyTotpCode", () => {
    it("should return true for a valid current code", () => {
      const secret = generateTotpSecret();
      // Generate a valid code using the same library
      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const validCode = totp.generate();

      expect(verifyTotpCode(secret, validCode)).toBe(true);
    });

    it("should return false for a wrong code", () => {
      const secret = generateTotpSecret();
      expect(verifyTotpCode(secret, "000000")).toBe(false);
    });

    it("should return false for an empty code", () => {
      const secret = generateTotpSecret();
      expect(verifyTotpCode(secret, "")).toBe(false);
    });

    it("should return false for a code with wrong number of digits", () => {
      const secret = generateTotpSecret();
      expect(verifyTotpCode(secret, "12345")).toBe(false);
      expect(verifyTotpCode(secret, "1234567")).toBe(false);
    });

    it("should accept codes within the time window (window=1)", () => {
      const secret = generateTotpSecret();
      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      // The current code should always be valid within window=1
      const currentCode = totp.generate();
      expect(verifyTotpCode(secret, currentCode)).toBe(true);
    });

    it("should return false for a non-numeric code", () => {
      const secret = generateTotpSecret();
      expect(verifyTotpCode(secret, "abcdef")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // generateQrCodeDataUrl
  // ---------------------------------------------------------------------------
  describe("generateQrCodeDataUrl", () => {
    it("should return a data URL string", async () => {
      const secret = generateTotpSecret();
      const dataUrl = await generateQrCodeDataUrl(secret, "test@example.com");
      expect(dataUrl).toContain("data:image/png;base64,");
    });
  });

  // ---------------------------------------------------------------------------
  // generateBackupCodes
  // ---------------------------------------------------------------------------
  describe("generateBackupCodes", () => {
    it("should generate exactly 10 codes", () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it("should generate 8-character uppercase hex codes", () => {
      const codes = generateBackupCodes();
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-F]{8}$/);
        expect(code.length).toBe(8);
      }
    });

    it("should generate unique codes (no duplicates in a set)", () => {
      const codes = generateBackupCodes();
      const uniqueCodes = new Set(codes);
      // With 4 bytes of randomness per code, collisions are astronomically unlikely
      expect(uniqueCodes.size).toBe(10);
    });

    it("should produce different codes on subsequent calls", () => {
      const codes1 = generateBackupCodes();
      const codes2 = generateBackupCodes();
      // Extremely unlikely to be equal
      expect(codes1).not.toEqual(codes2);
    });
  });

  // ---------------------------------------------------------------------------
  // hashBackupCodes
  // ---------------------------------------------------------------------------
  describe("hashBackupCodes", () => {
    it("should return a JSON string of hashed codes", async () => {
      const codes = ["ABCD1234", "EFGH5678"];
      const result = await hashBackupCodes(codes);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
      // Hashes should not equal the original codes
      expect(parsed[0]).not.toBe("ABCD1234");
      expect(parsed[1]).not.toBe("EFGH5678");
    });

    it("should produce bcrypt hashes that can be verified", async () => {
      const codes = ["TESTCODE"];
      const result = await hashBackupCodes(codes);
      const parsed = JSON.parse(result);
      // bcrypt compare should succeed
      const match = await bcrypt.compare("TESTCODE", parsed[0]);
      expect(match).toBe(true);
    });

    it("should normalize codes to uppercase before hashing", async () => {
      const codes = ["abcd1234"];
      const result = await hashBackupCodes(codes);
      const parsed = JSON.parse(result);
      // The function calls code.toUpperCase() before hashing
      const matchUpper = await bcrypt.compare("ABCD1234", parsed[0]);
      expect(matchUpper).toBe(true);
    });

    it("should handle empty array", async () => {
      const result = await hashBackupCodes([]);
      expect(JSON.parse(result)).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // verifyAndConsumeBackupCode
  // ---------------------------------------------------------------------------
  describe("verifyAndConsumeBackupCode", () => {
    it("should return false when no MFA config exists", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      const result = await verifyAndConsumeBackupCode("user-1", "ABCD1234");
      expect(result).toBe(false);
    });

    it("should return false when MFA config has no backup codes", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes: null,
      } as never);

      const result = await verifyAndConsumeBackupCode("user-1", "ABCD1234");
      expect(result).toBe(false);
    });

    it("should return true and consume a valid backup code", async () => {
      const plainCode = "ABCD1234";
      const hashedCode = await bcrypt.hash(plainCode, 10);
      const backupCodes = JSON.stringify([
        hashedCode,
        await bcrypt.hash("EFGH5678", 10),
      ]);

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      const result = await verifyAndConsumeBackupCode("user-1", plainCode);
      expect(result).toBe(true);

      // Verify the code was marked as used (empty string)
      expect(prisma.mfaConfig.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: {
          backupCodes: expect.any(String),
        },
      });

      // Verify the consumed code is now empty in the saved array
      const updateCall = vi.mocked(prisma.mfaConfig.update).mock.calls[0][0];
      const savedCodes = JSON.parse(updateCall.data.backupCodes as string);
      expect(savedCodes[0]).toBe(""); // first code consumed
      expect(savedCodes[1]).not.toBe(""); // second code still present
    });

    it("should return false for an invalid backup code", async () => {
      const hashedCode = await bcrypt.hash("ABCD1234", 10);
      const backupCodes = JSON.stringify([hashedCode]);

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);

      const result = await verifyAndConsumeBackupCode("user-1", "WRONGCOD");
      expect(result).toBe(false);
      expect(prisma.mfaConfig.update).not.toHaveBeenCalled();
    });

    it("should normalize code to uppercase and strip whitespace", async () => {
      const plainCode = "ABCD1234";
      const hashedCode = await bcrypt.hash(plainCode, 10);
      const backupCodes = JSON.stringify([hashedCode]);

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      // Pass lowercase with spaces
      const result = await verifyAndConsumeBackupCode("user-1", "abcd 1234");
      expect(result).toBe(true);
    });

    it("should not match an already-consumed (empty) backup code", async () => {
      const hashedCode = await bcrypt.hash("EFGH5678", 10);
      const backupCodes = JSON.stringify(["", hashedCode]); // first code already consumed

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      // Try to use the consumed code slot - should not match
      const result = await verifyAndConsumeBackupCode("user-1", "");
      // Empty string won't match empty string through bcrypt
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // countRemainingBackupCodes
  // ---------------------------------------------------------------------------
  describe("countRemainingBackupCodes", () => {
    it("should return 0 when no MFA config exists", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      const count = await countRemainingBackupCodes("user-1");
      expect(count).toBe(0);
    });

    it("should return 0 when backup codes are null", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes: null,
      } as never);

      const count = await countRemainingBackupCodes("user-1");
      expect(count).toBe(0);
    });

    it("should return count of non-empty codes", async () => {
      const backupCodes = JSON.stringify(["hash1", "", "hash3", "", "hash5"]);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);

      const count = await countRemainingBackupCodes("user-1");
      expect(count).toBe(3);
    });

    it("should return 0 when all codes are consumed", async () => {
      const backupCodes = JSON.stringify(["", "", "", ""]);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);

      const count = await countRemainingBackupCodes("user-1");
      expect(count).toBe(0);
    });

    it("should return full count when no codes are consumed", async () => {
      const backupCodes = JSON.stringify([
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "h7",
        "h8",
        "h9",
        "h10",
      ]);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);

      const count = await countRemainingBackupCodes("user-1");
      expect(count).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // setupMfa
  // ---------------------------------------------------------------------------
  describe("setupMfa", () => {
    it("should generate secret, QR code, and store config in DB", async () => {
      vi.mocked(prisma.mfaConfig.upsert).mockResolvedValue({} as never);

      const result = await setupMfa("user-1", "test@example.com");

      expect(result.secret).toBeDefined();
      expect(typeof result.secret).toBe("string");
      expect(result.qrCodeDataUrl).toContain("data:image/png;base64,");

      // Verify encrypt was called with the secret
      expect(encrypt).toHaveBeenCalledWith(result.secret);

      // Verify upsert was called correctly
      expect(prisma.mfaConfig.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        create: {
          userId: "user-1",
          encryptedSecret: result.secret, // mock encrypt returns same value
          iv: "",
          enabled: false,
        },
        update: {
          encryptedSecret: result.secret,
          iv: "",
          enabled: false,
          verifiedAt: null,
          backupCodes: null,
        },
      });
    });

    it("should not enable MFA until verified", async () => {
      vi.mocked(prisma.mfaConfig.upsert).mockResolvedValue({} as never);

      await setupMfa("user-1", "test@example.com");

      const upsertCall = vi.mocked(prisma.mfaConfig.upsert).mock.calls[0][0];
      expect(upsertCall.create.enabled).toBe(false);
      expect(upsertCall.update.enabled).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // verifyMfaSetup
  // ---------------------------------------------------------------------------
  describe("verifyMfaSetup", () => {
    it("should return success:false when no MFA config exists", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      const result = await verifyMfaSetup("user-1", "123456");
      expect(result.success).toBe(false);
      expect(result.backupCodes).toBeUndefined();
    });

    it("should return success:false for an invalid TOTP code", async () => {
      const secret = generateTotpSecret();
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        encryptedSecret: secret,
      } as never);
      // decrypt mock returns the value as-is
      vi.mocked(decrypt).mockResolvedValue(secret);

      const result = await verifyMfaSetup("user-1", "000000");
      expect(result.success).toBe(false);
      expect(result.backupCodes).toBeUndefined();
      expect(prisma.mfaConfig.update).not.toHaveBeenCalled();
    });

    it("should enable MFA and return backup codes for a valid code", async () => {
      const secret = generateTotpSecret();
      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const validCode = totp.generate();

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        encryptedSecret: secret,
      } as never);
      vi.mocked(decrypt).mockResolvedValue(secret);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      const result = await verifyMfaSetup("user-1", validCode);

      expect(result.success).toBe(true);
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);

      // Verify MFA was enabled in DB
      expect(prisma.mfaConfig.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: {
          enabled: true,
          verifiedAt: expect.any(Date),
          backupCodes: expect.any(String),
        },
      });
    });

    it("should store hashed backup codes, not plain text", async () => {
      const secret = generateTotpSecret();
      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const validCode = totp.generate();

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        encryptedSecret: secret,
      } as never);
      vi.mocked(decrypt).mockResolvedValue(secret);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      const result = await verifyMfaSetup("user-1", validCode);
      const updateCall = vi.mocked(prisma.mfaConfig.update).mock.calls[0][0];
      const storedCodes: string[] = JSON.parse(
        updateCall.data.backupCodes as string,
      );

      // Stored codes should be bcrypt hashes, not the plain codes
      for (const storedCode of storedCodes) {
        expect(storedCode).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
      }

      // Verify the stored hashes match the returned plain codes
      for (let i = 0; i < result.backupCodes!.length; i++) {
        const match = await bcrypt.compare(
          result.backupCodes![i],
          storedCodes[i],
        );
        expect(match).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // validateMfaCode
  // ---------------------------------------------------------------------------
  describe("validateMfaCode", () => {
    it("should return false when no MFA config exists", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      const result = await validateMfaCode("user-1", "123456");
      expect(result).toBe(false);
    });

    it("should return false when MFA is not enabled", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: false,
        encryptedSecret: "some-secret",
      } as never);

      const result = await validateMfaCode("user-1", "123456");
      expect(result).toBe(false);
    });

    it("should return true for a valid TOTP code when MFA is enabled", async () => {
      const secret = generateTotpSecret();
      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const validCode = totp.generate();

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
        encryptedSecret: secret,
      } as never);
      vi.mocked(decrypt).mockResolvedValue(secret);

      const result = await validateMfaCode("user-1", validCode);
      expect(result).toBe(true);
    });

    it("should return false for an invalid TOTP code when MFA is enabled", async () => {
      const secret = generateTotpSecret();

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
        encryptedSecret: secret,
      } as never);
      vi.mocked(decrypt).mockResolvedValue(secret);

      const result = await validateMfaCode("user-1", "000000");
      expect(result).toBe(false);
    });

    it("should decrypt the secret before verifying", async () => {
      const secret = generateTotpSecret();

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
        encryptedSecret: "encrypted-value",
      } as never);
      vi.mocked(decrypt).mockResolvedValue(secret);

      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const validCode = totp.generate();

      await validateMfaCode("user-1", validCode);

      expect(decrypt).toHaveBeenCalledWith("encrypted-value");
    });
  });

  // ---------------------------------------------------------------------------
  // hasMfaEnabled
  // ---------------------------------------------------------------------------
  describe("hasMfaEnabled", () => {
    it("should return false when no MFA config exists", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      const result = await hasMfaEnabled("user-1");
      expect(result).toBe(false);
    });

    it("should return false when MFA is not enabled", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: false,
      } as never);

      const result = await hasMfaEnabled("user-1");
      expect(result).toBe(false);
    });

    it("should return true when MFA is enabled", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
      } as never);

      const result = await hasMfaEnabled("user-1");
      expect(result).toBe(true);
    });

    it("should query the correct userId", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      await hasMfaEnabled("user-42");

      expect(prisma.mfaConfig.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-42" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getMfaStatus
  // ---------------------------------------------------------------------------
  describe("getMfaStatus", () => {
    it("should return disabled status when no MFA config exists", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      const status = await getMfaStatus("user-1");

      expect(status).toEqual({
        enabled: false,
        verifiedAt: null,
        remainingBackupCodes: 0,
      });
    });

    it("should return correct status when MFA is enabled with backup codes", async () => {
      const verifiedDate = new Date("2024-06-15T10:00:00Z");
      const backupCodes = JSON.stringify(["hash1", "hash2", "", "hash4", ""]);

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
        verifiedAt: verifiedDate,
        backupCodes,
      } as never);

      const status = await getMfaStatus("user-1");

      expect(status).toEqual({
        enabled: true,
        verifiedAt: verifiedDate,
        remainingBackupCodes: 3,
      });
    });

    it("should return 0 remaining codes when backup codes are null", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
        verifiedAt: new Date(),
        backupCodes: null,
      } as never);

      const status = await getMfaStatus("user-1");

      expect(status.remainingBackupCodes).toBe(0);
    });

    it("should return disabled status for pending (not yet verified) setup", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: false,
        verifiedAt: null,
        backupCodes: null,
      } as never);

      const status = await getMfaStatus("user-1");

      expect(status.enabled).toBe(false);
      expect(status.verifiedAt).toBeNull();
      expect(status.remainingBackupCodes).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // disableMfa
  // ---------------------------------------------------------------------------
  describe("disableMfa", () => {
    it("should delete the MFA config for the user", async () => {
      vi.mocked(prisma.mfaConfig.delete).mockResolvedValue({} as never);

      await disableMfa("user-1");

      expect(prisma.mfaConfig.delete).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });

    it("should call delete with the correct userId", async () => {
      vi.mocked(prisma.mfaConfig.delete).mockResolvedValue({} as never);

      await disableMfa("user-99");

      expect(prisma.mfaConfig.delete).toHaveBeenCalledWith({
        where: { userId: "user-99" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // regenerateBackupCodes
  // ---------------------------------------------------------------------------
  describe("regenerateBackupCodes", () => {
    it("should throw when MFA is not enabled", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue(null);

      await expect(regenerateBackupCodes("user-1")).rejects.toThrow(
        "MFA is not enabled",
      );
    });

    it("should throw when MFA config exists but is not enabled", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: false,
      } as never);

      await expect(regenerateBackupCodes("user-1")).rejects.toThrow(
        "MFA is not enabled",
      );
    });

    it("should generate and store new backup codes when MFA is enabled", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
      } as never);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      const codes = await regenerateBackupCodes("user-1");

      expect(codes).toHaveLength(10);
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-F]{8}$/);
      }

      expect(prisma.mfaConfig.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: {
          backupCodes: expect.any(String),
        },
      });
    });

    it("should store hashed versions of the returned codes", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
      } as never);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      const codes = await regenerateBackupCodes("user-1");

      const updateCall = vi.mocked(prisma.mfaConfig.update).mock.calls[0][0];
      const storedCodes: string[] = JSON.parse(
        updateCall.data.backupCodes as string,
      );

      expect(storedCodes).toHaveLength(10);
      for (let i = 0; i < codes.length; i++) {
        const match = await bcrypt.compare(codes[i], storedCodes[i]);
        expect(match).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Full enable/disable MFA flow (integration-style)
  // ---------------------------------------------------------------------------
  describe("Enable/Disable MFA Flow", () => {
    it("should complete a full setup -> verify -> validate -> disable flow", async () => {
      // Step 1: Setup MFA
      vi.mocked(prisma.mfaConfig.upsert).mockResolvedValue({} as never);
      const setup = await setupMfa("user-1", "test@example.com");

      expect(setup.secret).toBeDefined();
      expect(setup.qrCodeDataUrl).toBeDefined();

      // Step 2: Generate a valid TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(setup.secret),
      });
      const validCode = totp.generate();

      // Step 3: Verify MFA setup with valid code
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        encryptedSecret: setup.secret,
      } as never);
      vi.mocked(decrypt).mockResolvedValue(setup.secret);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      const verification = await verifyMfaSetup("user-1", validCode);
      expect(verification.success).toBe(true);
      expect(verification.backupCodes).toHaveLength(10);

      // Step 4: Validate MFA code during login
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
        encryptedSecret: setup.secret,
      } as never);

      const newCode = totp.generate();
      const loginValidation = await validateMfaCode("user-1", newCode);
      expect(loginValidation).toBe(true);

      // Step 5: Disable MFA
      vi.mocked(prisma.mfaConfig.delete).mockResolvedValue({} as never);
      await disableMfa("user-1");
      expect(prisma.mfaConfig.delete).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("setupMfa should upsert (overwrite pending setup)", async () => {
      vi.mocked(prisma.mfaConfig.upsert).mockResolvedValue({} as never);

      // Call setup twice for same user
      await setupMfa("user-1", "test@example.com");
      await setupMfa("user-1", "test@example.com");

      // Should have called upsert both times
      expect(prisma.mfaConfig.upsert).toHaveBeenCalledTimes(2);
    });

    it("verifyAndConsumeBackupCode should handle all codes consumed", async () => {
      const backupCodes = JSON.stringify(["", "", "", ""]);
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);

      const result = await verifyAndConsumeBackupCode("user-1", "ABCD1234");
      expect(result).toBe(false);
    });

    it("verifyTotpCode should handle malformed secret gracefully", () => {
      // OTPAuth.Secret.fromBase32 will throw for invalid base32
      expect(() => verifyTotpCode("!!!INVALID!!!", "123456")).toThrow();
    });

    it("getMfaStatus should handle empty backup codes JSON array", async () => {
      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        enabled: true,
        verifiedAt: new Date(),
        backupCodes: JSON.stringify([]),
      } as never);

      const status = await getMfaStatus("user-1");
      expect(status.remainingBackupCodes).toBe(0);
    });

    it("backup codes should be case-insensitive for verification", async () => {
      const plainCode = "ABCDEF12";
      const hashedCode = await bcrypt.hash(plainCode, 10);
      const backupCodes = JSON.stringify([hashedCode]);

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        backupCodes,
      } as never);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      // Pass lowercase version
      const result = await verifyAndConsumeBackupCode("user-1", "abcdef12");
      expect(result).toBe(true);
    });

    it("generateTotpSecret should produce valid base32 that round-trips through OTPAuth", () => {
      const secret = generateTotpSecret();
      // Should be able to create a Secret from the base32 without throwing
      const parsedSecret = OTPAuth.Secret.fromBase32(secret);
      expect(parsedSecret).toBeDefined();
      // Round-trip: re-encoding should produce the same base32
      expect(parsedSecret.base32).toBe(secret);
    });

    it("verifyMfaSetup should decrypt the stored secret", async () => {
      const secret = generateTotpSecret();
      const totp = new OTPAuth.TOTP({
        issuer: "Caelex",
        algorithm: "SHA256",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const validCode = totp.generate();

      vi.mocked(prisma.mfaConfig.findUnique).mockResolvedValue({
        userId: "user-1",
        encryptedSecret: "encrypted-data",
      } as never);
      vi.mocked(decrypt).mockResolvedValue(secret);
      vi.mocked(prisma.mfaConfig.update).mockResolvedValue({} as never);

      await verifyMfaSetup("user-1", validCode);

      expect(decrypt).toHaveBeenCalledWith("encrypted-data");
    });
  });
});
