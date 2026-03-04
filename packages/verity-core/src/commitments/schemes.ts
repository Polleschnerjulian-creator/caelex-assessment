/**
 * Commitment Schemes for Verity 2036
 *
 * SHA-256 blinded commitment scheme with domain separation.
 *
 * commitment = SHA256(domain_separator || canonical(context) || ieee754_be(value) || blinding_factor)
 *
 * Security properties:
 * - Hiding: 256-bit blinding factor from CSPRNG prevents value extraction
 * - Binding: SHA-256 collision resistance prevents opening to two different values
 * - Domain separation: prevents cross-protocol commitment reuse
 */

import { sha256 } from "@noble/hashes/sha256";
import { canonicalizeToBytes } from "../canonical/index.js";

/** Commitment scheme identifier */
export const COMMITMENT_SCHEME = "sha256-blinded-v2" as const;
export const COMMITMENT_VERSION = 2;

/** Size of blinding factor in bytes */
const BLINDING_FACTOR_BYTES = 32;

export interface CommitmentInput {
  /** Domain separation string (UTF-8) */
  domain: string;
  /** Context object to be canonically serialized */
  context: Record<string, unknown>;
  /** Numeric value being committed to */
  value: number;
  /** Optional blinding factor (32 bytes). Auto-generated from CSPRNG if omitted. */
  blindingFactor?: Uint8Array;
}

export interface Commitment {
  /** Hex-encoded SHA-256 hash */
  hash: string;
  /** Scheme identifier */
  scheme: typeof COMMITMENT_SCHEME;
  /** Scheme version */
  version: typeof COMMITMENT_VERSION;
}

export interface CommitmentSecret {
  /** The committed value */
  value: number;
  /** The blinding factor used (32 bytes) */
  blindingFactor: Uint8Array;
  /** The domain used */
  domain: string;
  /** The context used */
  context: Record<string, unknown>;
}

export interface CommitmentResult {
  commitment: Commitment;
  secret: CommitmentSecret;
}

/**
 * Encode a number as IEEE 754 big-endian 8 bytes.
 * This ensures consistent binary representation across platforms.
 */
export function encodeValueIEEE754BE(value: number): Uint8Array {
  if (!Number.isFinite(value)) {
    throw new Error("Cannot encode non-finite number in commitment");
  }
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false); // big-endian
  return new Uint8Array(buffer);
}

/**
 * Generate a cryptographically secure blinding factor.
 */
export function generateBlindingFactor(): Uint8Array {
  const bytes = new Uint8Array(BLINDING_FACTOR_BYTES);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Convert bytes to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have even length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substring(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`Invalid hex character at position ${i}`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Concatenate multiple Uint8Arrays into one.
 */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Create a SHA-256 blinded commitment with domain separation.
 *
 * commitment = SHA256(domain_bytes || canonical(context) || ieee754_be(value) || blinding_factor)
 *
 * @param input - The commitment input parameters
 * @returns The commitment hash and the secret (value + blinding factor) needed to open it
 */
export function createCommitment(input: CommitmentInput): CommitmentResult {
  const { domain, context, value } = input;

  if (!domain || domain.length === 0) {
    throw new Error("Domain separator must be non-empty");
  }

  if (!Number.isFinite(value)) {
    throw new Error("Value must be a finite number");
  }

  // Generate or use provided blinding factor
  const blindingFactor = input.blindingFactor ?? generateBlindingFactor();

  if (blindingFactor.length !== BLINDING_FACTOR_BYTES) {
    throw new Error(
      `Blinding factor must be ${BLINDING_FACTOR_BYTES} bytes, got ${blindingFactor.length}`,
    );
  }

  // Encode components
  const domainBytes = new TextEncoder().encode(domain);
  const contextBytes = canonicalizeToBytes(context);
  const valueBytes = encodeValueIEEE754BE(value);

  // Concatenate: domain || canonical(context) || ieee754_be(value) || blinding
  const preimage = concatBytes(
    domainBytes,
    contextBytes,
    valueBytes,
    blindingFactor,
  );

  // Hash
  const hash = sha256(preimage);

  return {
    commitment: {
      hash: bytesToHex(hash),
      scheme: COMMITMENT_SCHEME,
      version: COMMITMENT_VERSION,
    },
    secret: {
      value,
      blindingFactor,
      domain,
      context,
    },
  };
}

/**
 * Verify a commitment by recomputing the hash with the provided secret.
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param commitment - The commitment to verify
 * @param secret - The opening secret (value, blinding factor, domain, context)
 * @returns true if the commitment matches the recomputed hash
 */
export function verifyCommitment(
  commitment: Commitment,
  secret: CommitmentSecret,
): boolean {
  if (commitment.scheme !== COMMITMENT_SCHEME) {
    return false;
  }

  if (commitment.version !== COMMITMENT_VERSION) {
    return false;
  }

  try {
    // Recompute the commitment
    const domainBytes = new TextEncoder().encode(secret.domain);
    const contextBytes = canonicalizeToBytes(secret.context);
    const valueBytes = encodeValueIEEE754BE(secret.value);

    const preimage = concatBytes(
      domainBytes,
      contextBytes,
      valueBytes,
      secret.blindingFactor,
    );

    const expectedHash = sha256(preimage);
    const actualHash = hexToBytes(commitment.hash);

    // Constant-time comparison
    return constantTimeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}

/**
 * Constant-time comparison of two byte arrays.
 * Prevents timing side-channel attacks on hash comparison.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}
