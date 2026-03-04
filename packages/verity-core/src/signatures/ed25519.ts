/**
 * Verity 2036 — Ed25519 Signature Module
 *
 * All signing operations use domain separation: the signature is computed over
 * SHA-512(domain_bytes || message_bytes), NOT over raw message bytes.
 *
 * This prevents cross-protocol signature reuse: a signature created for an
 * attestation cannot be replayed as a certificate signature.
 *
 * Uses @noble/curves for Ed25519 — audited, pure JS, no native bindings.
 */

import { ed25519 } from "@noble/curves/ed25519";
import { bytesToHex, hexToBytes } from "../commitments/schemes.js";

/** Domain separation tags for all signing contexts */
export const DOMAIN_TAGS = {
  ATTESTATION: "VERITY2036_ATTESTATION_V2",
  CERTIFICATE: "VERITY2036_CERTIFICATE_V2",
  KEY_ROTATION: "VERITY2036_KEY_ROTATION_V2",
  KEY_REVOCATION: "VERITY2036_KEY_REVOCATION_V2",
  TRANSPARENCY_ENTRY: "VERITY2036_TRANSPARENCY_ENTRY_V2",
} as const;

export type DomainTag = (typeof DOMAIN_TAGS)[keyof typeof DOMAIN_TAGS];

export interface KeyPair {
  /** Hex-encoded Ed25519 private key (32 bytes = 64 hex chars) */
  privateKey: string;
  /** Hex-encoded Ed25519 public key (32 bytes = 64 hex chars) */
  publicKey: string;
}

export interface Signature {
  /** Hex-encoded Ed25519 signature (64 bytes = 128 hex chars) */
  signature: string;
  /** The domain tag used for this signature */
  domain: string;
}

/**
 * Generate an Ed25519 key pair using CSPRNG.
 *
 * Private key is 32 random bytes from crypto.getRandomValues.
 * Public key is derived from the private key via Ed25519 scalar multiplication.
 */
export function generateKeyPair(): KeyPair {
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);

  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);

  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: bytesToHex(publicKeyBytes),
  };
}

/**
 * Derive the public key from a private key.
 */
export function getPublicKey(privateKeyHex: string): string {
  const privateKeyBytes = hexToBytes(privateKeyHex);
  if (privateKeyBytes.length !== 32) {
    throw new Error("Private key must be 32 bytes");
  }
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return bytesToHex(publicKeyBytes);
}

/**
 * Compute the domain-separated message digest.
 *
 * digest = SHA-512(domain_bytes || message_bytes)
 *
 * Ed25519 internally hashes the message, but we pre-hash with domain separation
 * to ensure the domain tag is cryptographically bound to the signature.
 * We use Ed25519ph (pre-hashed) semantics via signing the hash directly.
 *
 * Actually, for Ed25519 (not Ed25519ph), we should pass the full
 * domain || message as the message to sign. Ed25519 already does internal
 * SHA-512, so we just concatenate domain + message and pass to sign().
 */
function domainSeparatedMessage(
  domain: string,
  message: Uint8Array,
): Uint8Array {
  const domainBytes = new TextEncoder().encode(domain);
  const combined = new Uint8Array(domainBytes.length + message.length);
  combined.set(domainBytes, 0);
  combined.set(message, domainBytes.length);
  return combined;
}

/**
 * Sign a message with Ed25519 and domain separation.
 *
 * The actual signed payload is: domain_bytes || message_bytes
 * This ensures signatures are context-bound and cannot be replayed across domains.
 *
 * @param privateKeyHex - Hex-encoded 32-byte Ed25519 private key
 * @param domain - Domain separation tag (e.g., VERITY2036_ATTESTATION_V2)
 * @param message - The message bytes to sign
 * @returns The signature with domain tag
 */
export function sign(
  privateKeyHex: string,
  domain: string,
  message: Uint8Array,
): Signature {
  if (!domain || domain.length === 0) {
    throw new Error("Domain separator must be non-empty");
  }

  const privateKeyBytes = hexToBytes(privateKeyHex);
  if (privateKeyBytes.length !== 32) {
    throw new Error("Private key must be 32 bytes");
  }

  const payload = domainSeparatedMessage(domain, message);
  const signatureBytes = ed25519.sign(payload, privateKeyBytes);

  return {
    signature: bytesToHex(signatureBytes),
    domain,
  };
}

/**
 * Verify an Ed25519 signature with domain separation.
 *
 * Reconstructs the signed payload as domain_bytes || message_bytes
 * and verifies the signature against it.
 *
 * @noble/curves enforces strict verification:
 * - Rejects non-canonical S values (S >= curve order L)
 * - Rejects small-order public keys
 * - Prevents signature malleability
 *
 * @param publicKeyHex - Hex-encoded 32-byte Ed25519 public key
 * @param domain - Domain separation tag (must match what was used for signing)
 * @param message - The original message bytes
 * @param signatureHex - Hex-encoded 64-byte Ed25519 signature
 * @returns true if the signature is valid
 */
export function verify(
  publicKeyHex: string,
  domain: string,
  message: Uint8Array,
  signatureHex: string,
): boolean {
  if (!domain || domain.length === 0) {
    return false;
  }

  try {
    const publicKeyBytes = hexToBytes(publicKeyHex);
    if (publicKeyBytes.length !== 32) {
      return false;
    }

    const signatureBytes = hexToBytes(signatureHex);
    if (signatureBytes.length !== 64) {
      return false;
    }

    const payload = domainSeparatedMessage(domain, message);

    // @noble/curves verify is strict:
    // - Checks S < L (curve order), rejecting malleable signatures
    // - Checks public key is valid point
    // - Returns boolean, does not throw on invalid signature
    return ed25519.verify(signatureBytes, payload, publicKeyBytes);
  } catch {
    // Any decoding error → invalid signature
    return false;
  }
}

/**
 * Verify that a signature was made with a specific domain tag.
 * This is a convenience wrapper that also checks the domain matches.
 */
export function verifyWithDomain(
  publicKeyHex: string,
  expectedDomain: DomainTag,
  message: Uint8Array,
  sig: Signature,
): boolean {
  // Ensure the domain tag matches what we expect
  if (sig.domain !== expectedDomain) {
    return false;
  }
  return verify(publicKeyHex, sig.domain, message, sig.signature);
}

export { bytesToHex, hexToBytes } from "../commitments/schemes.js";
