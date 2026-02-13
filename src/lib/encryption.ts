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
const ORG_KEY_PREFIX = "org:";

// Key derivation cache (derived once per process)
let cachedKey: Buffer | null = null;

// Per-organization key cache (LRU-style with max 100 entries)
const orgKeyCache = new Map<string, { key: Buffer; lastUsed: number }>();
const MAX_ORG_KEY_CACHE_SIZE = 100;

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
 * Derive a per-organization encryption key.
 * Uses scrypt to derive a unique key by combining the master key with organizationId.
 * This ensures each tenant's data is encrypted with a unique key.
 */
async function getOrgKey(organizationId: string): Promise<Buffer> {
  // Check cache first
  const cached = orgKeyCache.get(organizationId);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.key;
  }

  // Derive master key first
  const masterKey = await getKey();

  // Derive org-specific key using scrypt with organizationId as additional salt
  // This creates a unique key per organization while still depending on the master secret
  const orgSalt = `org:${organizationId}:${process.env.ENCRYPTION_SALT}`;
  const orgKey = (await scryptAsync(masterKey, orgSalt, 32)) as Buffer;

  // Manage cache size (simple LRU eviction)
  if (orgKeyCache.size >= MAX_ORG_KEY_CACHE_SIZE) {
    // Find and remove least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, value] of orgKeyCache.entries()) {
      if (value.lastUsed < oldestTime) {
        oldestTime = value.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      orgKeyCache.delete(oldestKey);
    }
  }

  // Cache the derived key
  orgKeyCache.set(organizationId, { key: orgKey, lastUsed: Date.now() });

  return orgKey;
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

// ─── Per-Organization Encryption ───

/**
 * Encrypt sensitive data with a per-organization key.
 * Use this for tenant-specific data to ensure cryptographic isolation.
 *
 * @param plaintext - The string to encrypt
 * @param organizationId - The organization's unique ID
 * @returns Encrypted string in format: org:organizationId:iv:authTag:ciphertext
 */
export async function encryptForOrg(
  plaintext: string,
  organizationId: string,
): Promise<string> {
  if (!plaintext) {
    return plaintext;
  }

  if (!organizationId) {
    throw new Error("organizationId is required for per-tenant encryption");
  }

  const key = await getOrgKey(organizationId);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: org:organizationId:iv:authTag:encryptedData
  return `${ORG_KEY_PREFIX}${organizationId}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt data encrypted with per-organization key.
 * Automatically extracts organizationId from the encrypted string.
 *
 * @param encryptedText - Encrypted string in format: org:organizationId:iv:authTag:ciphertext
 * @returns Original plaintext
 */
export async function decryptForOrg(encryptedText: string): Promise<string> {
  if (!encryptedText) {
    return encryptedText;
  }

  // Check if this is org-encrypted format
  if (!encryptedText.startsWith(ORG_KEY_PREFIX)) {
    throw new Error(
      "Invalid encrypted text format: expected org-encrypted data",
    );
  }

  // Remove prefix and split
  const withoutPrefix = encryptedText.slice(ORG_KEY_PREFIX.length);
  const parts = withoutPrefix.split(":");

  if (parts.length !== 4) {
    throw new Error("Invalid org-encrypted text format");
  }

  const [organizationId, ivHex, authTagHex, ciphertext] = parts;

  const key = await getOrgKey(organizationId);
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
 * Check if a string is encrypted with per-organization key.
 */
export function isOrgEncrypted(text: string): boolean {
  if (!text) return false;
  return text.startsWith(ORG_KEY_PREFIX);
}

/**
 * Smart decrypt that handles both legacy (shared key) and per-org encrypted data.
 * Use this during migration period to support both formats.
 */
export async function smartDecrypt(encryptedText: string): Promise<string> {
  if (!encryptedText) {
    return encryptedText;
  }

  if (isOrgEncrypted(encryptedText)) {
    return decryptForOrg(encryptedText);
  }

  if (isEncrypted(encryptedText)) {
    return decrypt(encryptedText);
  }

  // Not encrypted, return as-is
  return encryptedText;
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

// ─── Per-Organization Field Encryption Helpers ───

/**
 * Encrypt all sensitive fields in an object using per-organization key.
 * Use this for tenant-specific data.
 */
export async function encryptFieldsForOrg<T extends Record<string, unknown>>(
  modelName: string,
  data: T,
  organizationId: string,
): Promise<T> {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[modelName] || [];
  const result = { ...data } as Record<string, unknown>;

  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = await encryptForOrg(
        result[field] as string,
        organizationId,
      );
    }
  }

  return result as T;
}

/**
 * Decrypt all sensitive fields in an object (supports both legacy and per-org encryption).
 * Uses smartDecrypt to handle both formats during migration.
 */
export async function decryptFieldsSmart<T extends Record<string, unknown>>(
  modelName: string,
  data: T,
): Promise<T> {
  const fieldsToDecrypt = ENCRYPTED_FIELDS[modelName] || [];
  const result = { ...data } as Record<string, unknown>;

  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (
      value &&
      typeof value === "string" &&
      (isEncrypted(value) || isOrgEncrypted(value))
    ) {
      try {
        result[field] = await smartDecrypt(value);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }

  return result as T;
}

/**
 * Decrypt sensitive fields in an array using smart decryption.
 */
export async function decryptFieldsArraySmart<T extends Record<string, any>>(
  modelName: string,
  dataArray: T[],
): Promise<T[]> {
  return Promise.all(
    dataArray.map((item) => decryptFieldsSmart(modelName, item)),
  );
}

/**
 * Re-encrypt data from legacy shared key to per-organization key.
 * Use this for migrating existing encrypted data.
 */
export async function migrateToOrgEncryption(
  encryptedText: string,
  organizationId: string,
): Promise<string> {
  if (!encryptedText) {
    return encryptedText;
  }

  // Already org-encrypted, no migration needed
  if (isOrgEncrypted(encryptedText)) {
    return encryptedText;
  }

  // Decrypt with legacy key and re-encrypt with org key
  if (isEncrypted(encryptedText)) {
    const plaintext = await decrypt(encryptedText);
    return encryptForOrg(plaintext, organizationId);
  }

  // Not encrypted, encrypt with org key
  return encryptForOrg(encryptedText, organizationId);
}
