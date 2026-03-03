import { sign, verify, type KeyObject } from "node:crypto";

/**
 * Sign a content hash with Ed25519 private key.
 * Returns prefixed base64 signature.
 */
export function signContent(
  contentHash: string,
  privateKey: KeyObject,
): string {
  const data = Buffer.from(contentHash, "utf-8");
  const signature = sign(null, data, privateKey);
  return `ed25519:${signature.toString("base64")}`;
}

/**
 * Verify an Ed25519 signature against a content hash.
 */
export function verifySignature(
  contentHash: string,
  signatureStr: string,
  publicKey: KeyObject,
): boolean {
  const sigBase64 = signatureStr.replace("ed25519:", "");
  const sigBuffer = Buffer.from(sigBase64, "base64");
  const data = Buffer.from(contentHash, "utf-8");
  return verify(null, data, publicKey, sigBuffer);
}
