import {
  generateKeyPairSync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "../utils/redaction";

/**
 * Issuer Key Management with Key Rotation.
 *
 * Each key has a key_id (e.g. "verity-2026-03-01").
 * Attestations reference the key via key_id.
 * On rotation: new key becomes "active", old key stays for verification.
 *
 * This allows old attestations to be verified EVEN AFTER KEY ROTATION.
 */

export interface IssuerKeyInfo {
  keyId: string;
  publicKeyHex: string;
  active: boolean;
  createdAt: Date;
}

/**
 * Generates a new Issuer Key Pair.
 * Private key is AES-256-GCM encrypted with VERITY_MASTER_KEY.
 *
 * Key ID format: "verity-{YYYY}-{MM}-{DD}"
 */
export async function generateIssuerKeyPair(): Promise<{
  keyId: string;
  publicKeyHex: string;
  encryptedPrivateKeyHex: string;
}> {
  const masterKey = process.env.VERITY_MASTER_KEY;
  if (!masterKey || masterKey.length !== 64) {
    throw new Error("VERITY_MASTER_KEY must be 64 hex chars (32 bytes)");
  }

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });

  // Encrypt private key
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(masterKey, "hex"),
    iv,
  );
  const encrypted = Buffer.concat([cipher.update(privDer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedPrivateKeyHex = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;

  const now = new Date();
  const keyId = `verity-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  safeLog("Issuer key pair generated", { keyId });

  return {
    keyId,
    publicKeyHex: pubDer.toString("hex"),
    encryptedPrivateKeyHex,
  };
}

/**
 * Decrypts a private key using VERITY_MASTER_KEY.
 */
export function decryptPrivateKey(encryptedHex: string): Buffer {
  const masterKey = process.env.VERITY_MASTER_KEY;
  if (!masterKey || masterKey.length !== 64) {
    throw new Error("VERITY_MASTER_KEY must be 64 hex chars (32 bytes)");
  }

  const parts = encryptedHex.split(":");
  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted key format (expected iv:authTag:ciphertext)",
    );
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;

  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(masterKey, "hex"),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
}

/**
 * T4-6 (audit fix 2026-05-05): module-level cache for the active
 * issuer key. Saves one DB roundtrip + one AES-256-GCM decrypt per
 * attestation. The active key changes only on operator-initiated
 * rotation; the cache TTL caps any stale read at 5 minutes even
 * without an explicit invalidation. `invalidateActiveIssuerKeyCache`
 * is called from `rotateIssuerKey` for instant invalidation in the
 * same process.
 *
 * Cache scope is per Node.js process (Vercel serverless instance).
 * Each cold start refills it on first hit; multi-instance staleness
 * is bounded by the TTL.
 */
const ACTIVE_KEY_CACHE_TTL_MS = 5 * 60 * 1000;

interface ActiveKeyCacheEntry {
  keyId: string;
  publicKeyHex: string;
  privateKeyDer: Buffer;
  expiresAt: number;
}

let activeKeyCache: ActiveKeyCacheEntry | null = null;

export function invalidateActiveIssuerKeyCache(): void {
  activeKeyCache = null;
}

/**
 * Load the active issuer key. If none exists, generate one.
 */
export async function getActiveIssuerKey(prisma: PrismaClient): Promise<{
  keyId: string;
  publicKeyHex: string;
  privateKeyDer: Buffer;
}> {
  const now = Date.now();
  if (activeKeyCache && activeKeyCache.expiresAt > now) {
    return {
      keyId: activeKeyCache.keyId,
      publicKeyHex: activeKeyCache.publicKeyHex,
      privateKeyDer: activeKeyCache.privateKeyDer,
    };
  }

  // 1. Find active key in VerityIssuerKey
  let key = await prisma.verityIssuerKey.findFirst({
    where: { active: true },
  });

  // 2. If none exists: generate new
  if (!key) {
    const generated = await generateIssuerKeyPair();
    key = await prisma.verityIssuerKey.create({
      data: {
        keyId: generated.keyId,
        publicKeyHex: generated.publicKeyHex,
        encryptedPrivKey: generated.encryptedPrivateKeyHex,
        algorithm: "Ed25519",
        active: true,
      },
    });
    safeLog("Auto-generated initial issuer key", { keyId: key.keyId });
  }

  // 3. Decrypt private key
  const privateKeyDer = decryptPrivateKey(key.encryptedPrivKey);

  activeKeyCache = {
    keyId: key.keyId,
    publicKeyHex: key.publicKeyHex,
    privateKeyDer,
    expiresAt: now + ACTIVE_KEY_CACHE_TTL_MS,
  };

  return {
    keyId: key.keyId,
    publicKeyHex: key.publicKeyHex,
    privateKeyDer,
  };
}

/**
 * Load a key by its key_id (for verification of old attestations).
 */
export async function getKeyByKeyId(
  prisma: PrismaClient,
  keyId: string,
): Promise<{ publicKeyHex: string } | null> {
  const key = await prisma.verityIssuerKey.findFirst({
    where: { keyId },
  });
  if (!key) return null;
  return { publicKeyHex: key.publicKeyHex };
}
