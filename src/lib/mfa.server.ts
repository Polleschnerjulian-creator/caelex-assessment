/**
 * Multi-Factor Authentication (MFA) Service
 * Handles TOTP generation, verification, and backup codes
 *
 * Uses AES-256-GCM encryption for secrets (consistent with existing encryption.ts)
 */

import "server-only";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";

const ISSUER = "Caelex";
const ALGORITHM = "SHA1";
const DIGITS = 6;
const PERIOD = 30; // seconds

// Generate a new TOTP secret
export function generateTotpSecret(): string {
  // Generate a 20-byte (160-bit) secret for SHA1 TOTP
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

// Create TOTP instance from secret
function createTotp(secret: string, userEmail: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

// Generate QR code as data URL
export async function generateQrCodeDataUrl(
  secret: string,
  userEmail: string,
): Promise<string> {
  const totp = createTotp(secret, userEmail);
  const uri = totp.toString();
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

// Verify a TOTP code (with time window)
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // Allow 1 period before/after for clock drift
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

// Generate backup codes (10 codes, 8 characters each)
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

// Hash backup codes for storage
export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashedCodes = await Promise.all(
    codes.map((code) => bcrypt.hash(code.toUpperCase(), 10)),
  );
  return JSON.stringify(hashedCodes);
}

// Verify and consume a backup code
export async function verifyAndConsumeBackupCode(
  userId: string,
  code: string,
): Promise<boolean> {
  const mfaConfig = await prisma.mfaConfig.findUnique({
    where: { userId },
  });

  if (!mfaConfig?.backupCodes) {
    return false;
  }

  const hashedCodes: string[] = JSON.parse(mfaConfig.backupCodes);
  const normalizedCode = code.toUpperCase().replace(/\s/g, "");

  // Find which code matches
  for (let i = 0; i < hashedCodes.length; i++) {
    if (
      hashedCodes[i] &&
      (await bcrypt.compare(normalizedCode, hashedCodes[i]))
    ) {
      // Remove the used code
      hashedCodes[i] = ""; // Mark as used
      await prisma.mfaConfig.update({
        where: { userId },
        data: { backupCodes: JSON.stringify(hashedCodes) },
      });
      return true;
    }
  }

  return false;
}

// Count remaining backup codes
export async function countRemainingBackupCodes(
  userId: string,
): Promise<number> {
  const mfaConfig = await prisma.mfaConfig.findUnique({
    where: { userId },
  });

  if (!mfaConfig?.backupCodes) {
    return 0;
  }

  const hashedCodes: string[] = JSON.parse(mfaConfig.backupCodes);
  return hashedCodes.filter((code) => code !== "").length;
}

// Setup MFA for user (creates pending MfaConfig)
export async function setupMfa(
  userId: string,
  userEmail: string,
): Promise<{ secret: string; qrCodeDataUrl: string }> {
  // Generate new secret
  const secret = generateTotpSecret();

  // Encrypt the secret (returns "iv:authTag:ciphertext" format)
  const encryptedSecret = await encrypt(secret);

  // Generate QR code
  const qrCodeDataUrl = await generateQrCodeDataUrl(secret, userEmail);

  // Store in database (not enabled until verified)
  // The iv is embedded in the encrypted string format
  await prisma.mfaConfig.upsert({
    where: { userId },
    create: {
      userId,
      encryptedSecret,
      iv: "", // Not used - iv is in encryptedSecret
      enabled: false,
    },
    update: {
      encryptedSecret,
      iv: "",
      enabled: false,
      verifiedAt: null,
      backupCodes: null,
    },
  });

  return { secret, qrCodeDataUrl };
}

// Verify initial MFA setup
export async function verifyMfaSetup(
  userId: string,
  code: string,
): Promise<{ success: boolean; backupCodes?: string[] }> {
  const mfaConfig = await prisma.mfaConfig.findUnique({
    where: { userId },
  });

  if (!mfaConfig) {
    return { success: false };
  }

  // Decrypt secret
  const secret = await decrypt(mfaConfig.encryptedSecret);

  // Verify code
  if (!verifyTotpCode(secret, code)) {
    return { success: false };
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await hashBackupCodes(backupCodes);

  // Enable MFA
  await prisma.mfaConfig.update({
    where: { userId },
    data: {
      enabled: true,
      verifiedAt: new Date(),
      backupCodes: hashedBackupCodes,
    },
  });

  return { success: true, backupCodes };
}

// Validate MFA code during login
export async function validateMfaCode(
  userId: string,
  code: string,
): Promise<boolean> {
  const mfaConfig = await prisma.mfaConfig.findUnique({
    where: { userId },
  });

  if (!mfaConfig?.enabled) {
    return false;
  }

  // Decrypt secret
  const secret = await decrypt(mfaConfig.encryptedSecret);

  // Verify code
  return verifyTotpCode(secret, code);
}

// Check if user has MFA enabled
export async function hasMfaEnabled(userId: string): Promise<boolean> {
  const mfaConfig = await prisma.mfaConfig.findUnique({
    where: { userId },
  });
  return mfaConfig?.enabled ?? false;
}

// Get MFA status for user
export async function getMfaStatus(userId: string): Promise<{
  enabled: boolean;
  verifiedAt: Date | null;
  remainingBackupCodes: number;
}> {
  const mfaConfig = await prisma.mfaConfig.findUnique({
    where: { userId },
  });

  if (!mfaConfig) {
    return { enabled: false, verifiedAt: null, remainingBackupCodes: 0 };
  }

  let remainingBackupCodes = 0;
  if (mfaConfig.backupCodes) {
    const hashedCodes: string[] = JSON.parse(mfaConfig.backupCodes);
    remainingBackupCodes = hashedCodes.filter((code) => code !== "").length;
  }

  return {
    enabled: mfaConfig.enabled,
    verifiedAt: mfaConfig.verifiedAt,
    remainingBackupCodes,
  };
}

// Disable MFA for user
export async function disableMfa(userId: string): Promise<void> {
  await prisma.mfaConfig.delete({
    where: { userId },
  });
}

// Regenerate backup codes
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const mfaConfig = await prisma.mfaConfig.findUnique({
    where: { userId },
  });

  if (!mfaConfig?.enabled) {
    throw new Error("MFA is not enabled");
  }

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await hashBackupCodes(backupCodes);

  await prisma.mfaConfig.update({
    where: { userId },
    data: { backupCodes: hashedBackupCodes },
  });

  return backupCodes;
}
