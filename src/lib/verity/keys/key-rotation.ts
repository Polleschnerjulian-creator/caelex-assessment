import type { PrismaClient } from "@prisma/client";
import { generateIssuerKeyPair } from "./issuer-keys";
import { safeLog } from "../utils/redaction";

/**
 * Rotates the active issuer key.
 *
 * 1. Marks the current active key as inactive (sets rotatedAt)
 * 2. Generates a new key pair
 * 3. Stores it as the new active key
 *
 * Old keys remain in the DB so old attestations can still be verified via key_id lookup.
 */
export async function rotateIssuerKey(
  prisma: PrismaClient,
): Promise<{ keyId: string; publicKeyHex: string }> {
  // Deactivate current active key
  await prisma.verityIssuerKey.updateMany({
    where: { active: true },
    data: { active: false, rotatedAt: new Date() },
  });

  // Generate and store new key
  const generated = await generateIssuerKeyPair();
  const newKey = await prisma.verityIssuerKey.create({
    data: {
      keyId: generated.keyId,
      publicKeyHex: generated.publicKeyHex,
      encryptedPrivKey: generated.encryptedPrivateKeyHex,
      algorithm: "Ed25519",
      active: true,
    },
  });

  safeLog("Issuer key rotated", {
    newKeyId: newKey.keyId,
  });

  return {
    keyId: newKey.keyId,
    publicKeyHex: newKey.publicKeyHex,
  };
}

/**
 * Lists all issuer keys (active + rotated) for the public-key endpoint.
 */
export async function listAllIssuerKeys(prisma: PrismaClient): Promise<
  Array<{
    key_id: string;
    public_key: string;
    algorithm: string;
    active: boolean;
    active_since: string;
  }>
> {
  const keys = await prisma.verityIssuerKey.findMany({
    orderBy: { createdAt: "desc" },
  });

  return keys.map((k) => ({
    key_id: k.keyId,
    public_key: k.publicKeyHex,
    algorithm: k.algorithm,
    active: k.active,
    active_since: k.createdAt.toISOString(),
  }));
}
