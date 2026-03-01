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
import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";

const ISSUER = "Caelex";
// SHA256 for new enrollments (OWASP recommended). Existing users enrolled with SHA1
// will need to re-enroll after this change, as the algorithm is embedded in the TOTP URI.
const ALGORITHM = "SHA256";
const DIGITS = 6;
const PERIOD = 30; // seconds

// ─── TOTP Replay Protection (Redis-backed) ───
// Distributed replay protection across all Vercel instances.
// Falls back to in-memory Map when Redis is not configured (dev only).
const REPLAY_TTL_SECONDS = 60; // Codes expire after 60s (2x TOTP period)
const REPLAY_PREFIX = "totp:replay:";

const replayRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// In-memory fallback for development (not safe for multi-instance production)
const usedTotpCodes = new Map<string, number>();

/**
 * Check if a TOTP code was already used (replay attack detection).
 * Uses Redis in production for distributed protection across instances.
 */
export async function isTotpCodeUsed(
  userId: string,
  code: string,
): Promise<boolean> {
  const key = `${REPLAY_PREFIX}${userId}:${code}`;
  if (replayRedis) {
    const exists = await replayRedis.exists(key);
    return exists === 1;
  }
  // In-memory fallback
  const ts = usedTotpCodes.get(`${userId}:${code}`);
  return ts !== undefined && Date.now() - ts < REPLAY_TTL_SECONDS * 1000;
}

/**
 * Mark a TOTP code as used to prevent replay within the TTL window.
 */
export async function markTotpCodeUsed(
  userId: string,
  code: string,
): Promise<void> {
  const key = `${REPLAY_PREFIX}${userId}:${code}`;
  if (replayRedis) {
    await replayRedis.set(key, "1", { ex: REPLAY_TTL_SECONDS });
    return;
  }
  // In-memory fallback
  usedTotpCodes.set(`${userId}:${code}`, Date.now());
}

// Clean up in-memory fallback periodically (no-op when Redis is used)
if (!replayRedis) {
  setInterval(() => {
    const cutoff = Date.now() - REPLAY_TTL_SECONDS * 1000;
    for (const [key, timestamp] of usedTotpCodes) {
      if (timestamp < cutoff) {
        usedTotpCodes.delete(key);
      }
    }
  }, 30_000);
}

// Generate a new TOTP secret
export function generateTotpSecret(): string {
  // Generate a 32-byte (256-bit) secret for SHA256 TOTP
  const secret = new OTPAuth.Secret({ size: 32 });
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
  if (!verifyTotpCode(secret, code)) {
    return false;
  }

  // Replay protection — reject previously used codes (Redis-backed)
  if (await isTotpCodeUsed(userId, code)) {
    return false;
  }
  await markTotpCodeUsed(userId, code);

  return true;
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
