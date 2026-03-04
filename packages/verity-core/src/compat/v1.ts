/**
 * Verity 2036 — V1 Compatibility Module
 *
 * Supports verification of Verity v1 attestations during the transition period.
 *
 * V1 differences from V2:
 * - No domain separation on signatures (Ed25519 signs raw canonical JSON)
 * - No domain separation on commitments (SHA-256 without domain prefix)
 * - Different attestation structure (version: "1.0", claim-based)
 * - Uses Node.js crypto Ed25519 (SPKI DER public keys) instead of raw bytes
 *
 * This module:
 * - Detects v1 attestations by protocol_version or version field
 * - Routes to legacy verification path
 * - Emits deprecation warnings
 * - NEVER allows creation of new v1 attestations
 */

import { ed25519 } from "@noble/curves/ed25519";
import { hexToBytes } from "../commitments/schemes.js";

/**
 * V1 attestation structure (simplified — only verification-relevant fields).
 *
 * V1 uses a "claim" structure instead of "statement" and "commitment".
 */
export interface V1Attestation {
  attestation_id: string;
  version: "1.0";
  claim: {
    regulation_ref: string;
    regulation_name: string;
    threshold_type: "ABOVE" | "BELOW";
    threshold_value: number;
    result: boolean;
    claim_statement: string;
  };
  subject: {
    operator_id: string;
    satellite_norad_id: string | null;
    satellite_name: string | null;
  };
  evidence: {
    value_commitment: string;
    source: string;
    trust_level: string;
    trust_range: string;
    sentinel_anchor: unknown;
    cross_verification: unknown;
  };
  issuer: {
    name: string;
    key_id: string;
    public_key: string;
    algorithm: string;
  };
  issued_at: string;
  expires_at: string;
  signature: string;
  verification_url?: string;
}

/**
 * V1 signed fields — only these fields are included when verifying the signature.
 */
const V1_SIGNED_FIELDS = [
  "attestation_id",
  "version",
  "claim",
  "subject",
  "evidence",
  "issuer",
  "issued_at",
  "expires_at",
] as const;

/**
 * V1-compatible canonical JSON serialization.
 *
 * V1 used a simple recursive key sort with JSON.stringify-compatible output.
 * We replicate this for verification compatibility.
 */
function v1CanonicalJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => v1CanonicalJson(item));
    return `[${items.join(",")}]`;
  }
  if (typeof value === "object") {
    const sorted = Object.keys(value as Record<string, unknown>)
      .sort()
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined);
    const pairs = sorted.map(
      (k) =>
        `${JSON.stringify(k)}:${v1CanonicalJson((value as Record<string, unknown>)[k])}`,
    );
    return `{${pairs.join(",")}}`;
  }
  return String(value);
}

/**
 * Extract the signed fields from a V1 attestation.
 */
function extractV1SignedPayload(
  attestation: V1Attestation,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of V1_SIGNED_FIELDS) {
    result[field] = attestation[field];
  }
  return result;
}

/**
 * Attempt to extract raw Ed25519 public key bytes from V1's SPKI DER hex.
 *
 * V1 stored public keys in SubjectPublicKeyInfo DER format.
 * The raw 32-byte Ed25519 key is the last 32 bytes of the SPKI structure.
 *
 * SPKI for Ed25519: 30 2a 30 05 06 03 2b 65 70 03 21 00 <32 bytes key>
 * Total: 44 bytes = 88 hex chars
 *
 * Falls back to treating the key as raw hex if it's exactly 64 chars.
 */
function extractRawPublicKey(publicKeyHex: string): Uint8Array {
  const bytes = hexToBytes(publicKeyHex);

  // If exactly 32 bytes, assume raw Ed25519 key
  if (bytes.length === 32) {
    return bytes;
  }

  // If 44 bytes, assume SPKI DER — extract last 32 bytes
  if (bytes.length === 44) {
    return bytes.slice(12);
  }

  throw new Error(`Unexpected public key length: ${bytes.length} bytes`);
}

export interface V1VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  deprecated: true;
}

/**
 * Detect whether an attestation is V1 format.
 *
 * V1 attestations have either:
 * - protocol_version === 1
 * - version === "1.0"
 */
export function isV1Attestation(
  attestation: unknown,
): attestation is V1Attestation {
  if (!attestation || typeof attestation !== "object") {
    return false;
  }

  const obj = attestation as Record<string, unknown>;

  // Check for V1 markers
  if (obj["protocol_version"] === 1) return true;
  if (obj["version"] === "1.0") return true;

  return false;
}

/**
 * Verify a V1 attestation.
 *
 * V1 verification:
 * 1. Extract signed fields
 * 2. Canonical JSON serialize (V1 rules: sorted keys, no domain separation)
 * 3. Verify Ed25519 signature (NO domain separation — raw message)
 * 4. Check expiry
 *
 * DEPRECATION: This function emits a warning. V1 attestations should be
 * re-issued as V2 when possible.
 *
 * @param attestation - The V1 attestation to verify
 * @returns Verification result with deprecated flag
 */
export function verifyV1Attestation(
  attestation: V1Attestation,
): V1VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [
    "DEPRECATED: V1 attestation format. Re-issue as V2 for domain-separated signatures.",
  ];

  // Structural validation
  if (!attestation.attestation_id) {
    errors.push("Missing attestation_id");
  }
  if (!attestation.signature) {
    errors.push("Missing signature");
  }
  if (!attestation.issuer?.public_key) {
    errors.push("Missing issuer public key");
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, deprecated: true };
  }

  // Expiry check
  if (attestation.expires_at) {
    const expiresAt = new Date(attestation.expires_at).getTime();
    const now = Date.now();
    if (now > expiresAt) {
      warnings.push("V1 attestation has expired");
    }
  }

  // Signature verification (NO domain separation — V1 signs raw canonical JSON)
  try {
    const signedPayload = extractV1SignedPayload(attestation);
    const canonicalBytes = new TextEncoder().encode(
      v1CanonicalJson(signedPayload),
    );

    const publicKeyRaw = extractRawPublicKey(attestation.issuer.public_key);
    const signatureBytes = hexToBytes(attestation.signature);

    if (signatureBytes.length !== 64) {
      errors.push("Invalid signature length");
      return { valid: false, errors, warnings, deprecated: true };
    }

    // V1: Ed25519 verify WITHOUT domain separation
    const valid = ed25519.verify(signatureBytes, canonicalBytes, publicKeyRaw);

    if (!valid) {
      errors.push("V1 signature verification failed");
    }
  } catch (e) {
    errors.push(
      `V1 verification error: ${e instanceof Error ? e.message : "unknown"}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    deprecated: true,
  };
}

/**
 * Version-dispatching verification.
 *
 * Detects the protocol version and routes to the appropriate verification path.
 * V1 attestations are verified using the legacy path.
 * V2+ attestations should use the standard validateAttestation from models/.
 *
 * @param attestation - Any version attestation
 * @returns Object with version info and whether to use V1 or V2 verification
 */
export function detectProtocolVersion(attestation: unknown): {
  version: number;
  isLegacy: boolean;
} {
  if (!attestation || typeof attestation !== "object") {
    return { version: 0, isLegacy: false };
  }

  const obj = attestation as Record<string, unknown>;

  if (obj["version"] === "1.0" || obj["protocol_version"] === 1) {
    return { version: 1, isLegacy: true };
  }

  if (typeof obj["protocol_version"] === "number") {
    return { version: obj["protocol_version"] as number, isLegacy: false };
  }

  return { version: 0, isLegacy: false };
}
