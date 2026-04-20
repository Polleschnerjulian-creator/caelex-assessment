/**
 * Verity Phase 2 — BLS12-381 Aggregate Signatures.
 *
 * Lets a certificate bundle of N attestations carry ONE signature
 * instead of N. Verification goes from O(N) ed25519 operations to
 * O(1) pairing — roughly 100× faster for a 100-attestation bundle
 * and ~100× smaller on the wire (64 B total vs. 64 × N B).
 *
 * Scheme: BLS12-381 with long signatures (pubkeys in G1, sigs in G2
 * via the RFC-style long-signature variant exposed by noble). This
 * matches the convention used in the Ethereum consensus layer and
 * the W3C `bls12381-g2-key-2020` suite, which makes the resulting
 * artefacts straightforward to plug into pillar 3 (Verifiable
 * Credentials with BLS proof-set).
 *
 * Libraries: @noble/curves/bls12-381 (MIT, zero-dep, audited).
 *
 * What this module provides
 *   - generateKeyPair()           new BLS keypair (hex-encoded)
 *   - sign(msg, sk)               single BLS signature
 *   - verify(sig, msg, pk)        single verification
 *   - aggregateSignatures([σ])    combine N sigs → 1
 *   - aggregatePublicKeys([pk])   combine N pubkeys → 1 (same-message aggregation)
 *   - verifyAggregate(            N (msg, pk) pairs against one sig
 *       sig, messages, publicKeys
 *     )
 *
 * Same-message vs distinct-message aggregation
 *   - If every attestation signs THE SAME bytes (e.g. certificate
 *     root hash), you can aggregatePublicKeys and do ONE pairing.
 *   - If each attestation signs ITS OWN message (the typical case
 *     for certificate bundles), use verifyAggregate which runs the
 *     RFC 9380 / ETH-2 multi-pairing verification.
 */

import { bls12_381 } from "@noble/curves/bls12-381.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const bls = bls12_381.longSignatures;

// ─── Types ──────────────────────────────────────────────────────────

export interface BLSKeyPair {
  /** 32 bytes, hex — keep secret */
  secretKeyHex: string;
  /** 48 bytes, hex (G1 compressed) */
  publicKeyHex: string;
  algorithm: "bls12-381-g2";
}

// ─── Key generation ────────────────────────────────────────────────

/**
 * Generate a fresh BLS keypair. Secret-key material is held in
 * memory only long enough for the caller to encrypt it at rest via
 * the same {VERITY_MASTER_KEY, AES-256-GCM} pipeline that guards
 * ed25519 private keys in issuer-keys.ts.
 */
export function generateBLSKeyPair(): BLSKeyPair {
  const { secretKey, publicKey } = bls.keygen();
  // secretKey is Uint8Array; publicKey is a WeierstrassPoint (G1)
  // — serialise both to hex for DB storage.
  return {
    secretKeyHex: bytesToHex(secretKey),
    publicKeyHex: bytesToHex(publicKey.toBytes(true)),
    algorithm: "bls12-381-g2",
  };
}

// ─── Signing ───────────────────────────────────────────────────────

function encodeMessage(msg: Uint8Array | string): Uint8Array {
  return typeof msg === "string" ? utf8ToBytes(msg) : msg;
}

export function signBLS(
  message: Uint8Array | string,
  secretKeyHex: string,
): string {
  const sk = hexToBytes(secretKeyHex);
  const msgBytes = encodeMessage(message);
  // bls.sign expects the pre-hashed curve point; .hash handles the
  // RFC 9380 hash-to-curve with the standard DST.
  const hashedMsg = bls.hash(msgBytes);
  const sig = bls.sign(hashedMsg, sk);
  return bytesToHex(bls.Signature.toBytes(sig));
}

export function verifyBLS(
  signatureHex: string,
  message: Uint8Array | string,
  publicKeyHex: string,
): boolean {
  try {
    const sig = bls.Signature.fromBytes(hexToBytes(signatureHex));
    const pk = hexToBytes(publicKeyHex);
    const hashedMsg = bls.hash(encodeMessage(message));
    return bls.verify(sig, hashedMsg, pk);
  } catch {
    return false;
  }
}

// ─── Aggregation ───────────────────────────────────────────────────

/**
 * Combine N signatures into one. All sigs must be over the same
 * underlying scheme; this is pure point addition on G2.
 */
export function aggregateSignatures(signatureHexes: string[]): string {
  if (signatureHexes.length === 0) {
    throw new Error("aggregateSignatures: empty input");
  }
  const sigs = signatureHexes.map((h) =>
    bls.Signature.fromBytes(hexToBytes(h)),
  );
  const agg = bls.aggregateSignatures(sigs);
  return bytesToHex(bls.Signature.toBytes(agg));
}

/**
 * Combine N pubkeys into one. Use this only when every signer is
 * signing THE SAME message (e.g. a certificate-root hash); for
 * per-attestation messages, use verifyAggregate below instead.
 */
export function aggregatePublicKeys(publicKeyHexes: string[]): string {
  if (publicKeyHexes.length === 0) {
    throw new Error("aggregatePublicKeys: empty input");
  }
  const pks = publicKeyHexes.map((h) => hexToBytes(h));
  const agg = bls.aggregatePublicKeys(pks);
  // G1 points serialise to 48 bytes compressed.
  return bytesToHex(agg.toBytes(true));
}

/**
 * Verify one aggregated signature against N distinct
 * (message, publicKey) pairs.
 *
 * Returns true iff the multi-pairing identity holds:
 *   e(σ_agg, G) == Π_i e(H(m_i), pk_i)
 */
export function verifyAggregate(
  aggregateSignatureHex: string,
  messages: Array<Uint8Array | string>,
  publicKeyHexes: string[],
): boolean {
  try {
    if (messages.length !== publicKeyHexes.length) return false;
    if (messages.length === 0) return false;

    const sig = bls.Signature.fromBytes(hexToBytes(aggregateSignatureHex));
    const items = messages.map((m, i) => ({
      message: bls.hash(encodeMessage(m)),
      publicKey: hexToBytes(publicKeyHexes[i]!),
    }));
    return bls.verifyBatch(sig, items);
  } catch {
    return false;
  }
}
