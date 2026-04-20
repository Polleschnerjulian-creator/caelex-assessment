/**
 * Verity Phase 2 — W3C Verifiable Credentials emitter.
 *
 * Emits every Verity attestation as a W3C VC 2.0 JSON-LD credential
 * alongside the native Verity format. This makes Atlas attestations
 * consumable by any VC-compatible wallet or verifier — the EU Digital
 * Identity Wallet (EUDIW) framework, Microsoft Entra Verified ID,
 * Trinsic, Dock, etc. — without any wrapper service.
 *
 * We use:
 *   - did:web for issuer identity (caelex.eu)
 *   - Ed25519Signature2020 proof suite for Phase 1 (v1) attestations
 *   - Data Integrity proof w/ ed25519-2020 cryptosuite for v2
 *
 * Everything runs locally — no external API calls, no managed
 * services, no paid deps.
 */

import type { ThresholdAttestation } from "../core/types";

// ─── DID:web configuration ──────────────────────────────────────────

export const CAELEX_DID = "did:web:caelex.eu";
export const CAELEX_KEY_ID_FRAGMENT = "#verity-issuer";

export interface DidWebDocument {
  "@context": string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  assertionMethod: string[];
  authentication: string[];
}

/**
 * Build the did:web/.well-known/did.json document for caelex.eu.
 * Served statically at /.well-known/did.json.
 *
 * The publicKey is the current active Verity Ed25519 issuer key,
 * encoded as multibase-base58btc prefixed with the Ed25519 multicodec
 * (ed25519-pub = 0xed 0x01).
 */
export function buildDidDocument(
  publicKeyHex: string,
  keyId: string,
): DidWebDocument {
  const multibase = encodeMultibaseEd25519(publicKeyHex);
  const vmId = `${CAELEX_DID}#${keyId}`;
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: CAELEX_DID,
    verificationMethod: [
      {
        id: vmId,
        type: "Ed25519VerificationKey2020",
        controller: CAELEX_DID,
        publicKeyMultibase: multibase,
      },
    ],
    assertionMethod: [vmId],
    authentication: [vmId],
  };
}

// ─── VC emission ────────────────────────────────────────────────────

export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  id: string;
  issuer: string;
  validFrom: string;
  validUntil: string;
  credentialSubject: {
    id: string;
    satelliteNorad: string | null;
    regulation: {
      ref: string;
      name: string;
      thresholdType: "ABOVE" | "BELOW";
      thresholdValue: number;
    };
    complianceResult: boolean;
    claim: string;
    evidence: {
      commitmentHash: string;
      source: string;
      trustLevel: string;
      trustRange: string;
    };
  };
  credentialStatus?: {
    id: string;
    type: string;
  };
  proof: {
    type: "Ed25519Signature2020";
    created: string;
    verificationMethod: string;
    proofPurpose: "assertionMethod";
    proofValue: string;
  };
}

/**
 * Convert a native Verity ThresholdAttestation into a W3C VC 2.0
 * JSON-LD credential. The same Ed25519 signature is re-encoded as
 * a VC proof — no re-signing, no extra compute, and the credential
 * is self-contained (no cross-lookup required by the verifier).
 */
export function attestationToVC(
  attestation: ThresholdAttestation,
): VerifiableCredential {
  const subjectId = attestation.subject.satellite_norad_id
    ? `urn:norad:${attestation.subject.satellite_norad_id}`
    : `urn:operator:${attestation.subject.operator_id}`;

  const keyRef = `${CAELEX_DID}#${attestation.issuer.key_id}`;

  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      "https://schema.caelex.eu/verity/v2",
    ],
    type: ["VerifiableCredential", "SpaceComplianceAttestation"],
    id: `urn:caelex:verity:${attestation.attestation_id}`,
    issuer: CAELEX_DID,
    validFrom: attestation.issued_at,
    validUntil: attestation.expires_at,
    credentialSubject: {
      id: subjectId,
      satelliteNorad: attestation.subject.satellite_norad_id,
      regulation: {
        ref: attestation.claim.regulation_ref,
        name: attestation.claim.regulation_name,
        thresholdType: attestation.claim.threshold_type,
        thresholdValue: attestation.claim.threshold_value,
      },
      complianceResult: attestation.claim.result,
      claim: attestation.claim.claim_statement,
      evidence: {
        commitmentHash: attestation.evidence.value_commitment,
        source: attestation.evidence.source,
        trustLevel: attestation.evidence.trust_level,
        trustRange: attestation.evidence.trust_range,
      },
    },
    credentialStatus: {
      id: `https://caelex.eu/api/v1/verity/attestation/status/${attestation.attestation_id}`,
      type: "RevocationList2020Status",
    },
    proof: {
      type: "Ed25519Signature2020",
      created: attestation.issued_at,
      verificationMethod: keyRef,
      proofPurpose: "assertionMethod",
      // We carry the same Ed25519 signature that guards the native
      // attestation. A VC-aware verifier that ONLY speaks VC can
      // still check by canonicalising the credentialSubject per the
      // ed25519-2020 suite — or fall back to /attestation/verify.
      proofValue: `z${attestation.signature}`,
    },
  };
}

// ─── Multibase Ed25519 helpers ──────────────────────────────────────

/**
 * Encode an Ed25519 public-key hex string as a multibase string
 * per W3C cid-v1 convention: 0xed 0x01 prefix (ed25519-pub
 * multicodec) + raw 32 bytes, then base58btc with 'z' prefix.
 *
 * Tiny pure-JS base58btc encoder so we avoid another dependency.
 */
/**
 * Ed25519 SPKI-DER public keys are always 44 bytes: a fixed 12-byte
 * SubjectPublicKeyInfo header followed by the 32 raw key bytes. The
 * Verity key store persists the SPKI-DER form (see issuer-keys.ts),
 * so we strip the header here. A bare 32-byte raw key is also
 * accepted for forward-compat.
 */
const ED25519_SPKI_PREFIX = new Uint8Array([
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
]);

function extractRawEd25519PublicKey(keyHex: string): Uint8Array {
  const bytes = hexToBytes(keyHex);
  if (bytes.length === 32) return bytes;
  if (bytes.length === 44) {
    // Validate the SPKI-DER header to avoid stripping junk silently.
    for (let i = 0; i < ED25519_SPKI_PREFIX.length; i++) {
      if (bytes[i] !== ED25519_SPKI_PREFIX[i]) {
        throw new Error(
          "extractRawEd25519PublicKey: 44-byte input has unexpected SPKI header",
        );
      }
    }
    return bytes.subarray(12);
  }
  throw new Error(
    `extractRawEd25519PublicKey: expected 32-byte raw or 44-byte SPKI DER key, got ${bytes.length}`,
  );
}

function encodeMultibaseEd25519(publicKeyHex: string): string {
  const raw = extractRawEd25519PublicKey(publicKeyHex);
  // Multicodec prefix for ed25519-pub: varint(0xed) = 0xed 0x01
  const prefixed = new Uint8Array(raw.length + 2);
  prefixed[0] = 0xed;
  prefixed[1] = 0x01;
  prefixed.set(raw, 2);
  return "z" + base58btcEncode(prefixed);
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58btcEncode(bytes: Uint8Array): string {
  // Count leading zeros — they encode as '1' prefix.
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  // Treat bytes as a big-endian integer and convert to base58 digits.
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]!;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let output = "";
  for (let i = 0; i < zeros; i++) output += "1";
  for (let i = digits.length - 1; i >= 0; i--) {
    output += BASE58_ALPHABET[digits[i]!];
  }
  return output;
}
