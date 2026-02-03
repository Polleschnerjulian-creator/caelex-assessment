/**
 * Field-Level Encryption Utilities
 *
 * Implements AES-256-GCM encryption for sensitive database fields.
 * Used for GDPR compliance and data protection.
 *
 * Required environment variables:
 * - ENCRYPTION_KEY: 32-character hex string (generate with: openssl rand -hex 32)
 * - ENCRYPTION_SALT: 16-character hex string (generate with: openssl rand -hex 16)
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Key derivation cache (derived once per process)
let cachedKey: Buffer | null = null;

/**
 * Derive encryption key from secret.
 * Uses scrypt for key derivation (memory-hard, resistant to brute force).
 */
async function getKey(): Promise<Buffer> {
  if (cachedKey) {
    return cachedKey;
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  const encryptionSalt = process.env.ENCRYPTION_SALT;

  if (!encryptionKey || !encryptionSalt) {
    throw new Error(
      "ENCRYPTION_KEY and ENCRYPTION_SALT must be set in environment variables",
    );
  }

  if (encryptionKey.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }

  cachedKey = (await scryptAsync(encryptionKey, encryptionSalt, 32)) as Buffer;
  return cachedKey;
}

/**
 * Encrypt sensitive data.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    return plaintext;
  }

  const key = await getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt encrypted data.
 *
 * @param encryptedText - Encrypted string in format: iv:authTag:ciphertext
 * @returns Original plaintext
 */
export async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText || !encryptedText.includes(":")) {
    return encryptedText;
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  const key = await getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string is encrypted (has the expected format).
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  const parts = text.split(":");
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
}

/**
 * Hash sensitive data for searching (one-way).
 * Use this when you need to search on encrypted fields.
 */
export async function hashForSearch(plaintext: string): Promise<string> {
  const key = await getKey();
  const hmac = await import("crypto").then((crypto) =>
    crypto.createHmac("sha256", key).update(plaintext).digest("hex"),
  );
  return hmac;
}

// ─── Field Encryption Helpers ───

/**
 * Fields that should be encrypted in each model.
 * Add fields here as needed for GDPR compliance.
 */
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ["taxId", "phoneNumber"],
  Organization: ["vatNumber", "bankAccount", "taxId"],
  InsuranceAssessment: ["policyNumber"],
  EnvironmentalAssessment: ["internalNotes"],
};

/**
 * Encrypt all sensitive fields in an object.
 */
export async function encryptFields<T extends Record<string, unknown>>(
  modelName: string,
  data: T,
): Promise<T> {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[modelName] || [];
  const result = { ...data } as Record<string, unknown>;

  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = await encrypt(result[field] as string);
    }
  }

  return result as T;
}

/**
 * Decrypt all sensitive fields in an object.
 */
export async function decryptFields<T extends Record<string, unknown>>(
  modelName: string,
  data: T,
): Promise<T> {
  const fieldsToDecrypt = ENCRYPTED_FIELDS[modelName] || [];
  const result = { ...data } as Record<string, unknown>;

  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (value && typeof value === "string" && isEncrypted(value)) {
      try {
        result[field] = await decrypt(value);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }

  return result as T;
}

/**
 * Decrypt sensitive fields in an array of objects.
 */
export async function decryptFieldsArray<T extends Record<string, any>>(
  modelName: string,
  dataArray: T[],
): Promise<T[]> {
  return Promise.all(dataArray.map((item) => decryptFields(modelName, item)));
}
