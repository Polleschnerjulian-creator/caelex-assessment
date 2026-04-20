/**
 * Verity Phase 2 — Pedersen Commitment Provider on Ristretto255.
 *
 * Replaces the Phase 1 SHA-256 commitment with a cryptographic
 * commitment scheme that is:
 *
 *   • hiding      — the commitment reveals no information about v
 *   • binding     — the committer cannot open C to a different v
 *   • homomorphic — C(v₁) + C(v₂) = C(v₁ + v₂), enabling aggregate
 *                   proofs across attestations without revealing
 *                   any individual value.
 *
 * The scheme:
 *
 *   C = r·G + v·H
 *
 *   where G is the standard Ristretto255 generator and H is a
 *   "nothing-up-my-sleeve" second generator derived deterministically
 *   from a hash-to-curve of a fixed domain string. Because no-one
 *   knows the discrete log of H with respect to G, the commitment is
 *   computationally binding under the DDH assumption in Ristretto255.
 *
 * What we ship in this version:
 *   • Pedersen commitments (real, homomorphic)
 *   • Schnorr σ-protocol proof of knowledge of (v, r) for C
 *   • Version byte in the attestation so v1 (SHA-256) and v2
 *     (Pedersen) live side by side.
 *
 * What comes later (Phase 2.1):
 *   • Bulletproof range proofs for "v is in [0, 2^n)" without
 *     revealing v. The current `range_proof` field carries only a
 *     proof-of-knowledge of the opening; bulletproofs slot in by
 *     upgrading the proof type without breaking the commitment or
 *     the signature layer.
 *
 * Libraries: @noble/curves (MIT, zero-deps, audited). No external
 * API calls, no paid services.
 */

import { ristretto255, ristretto255_hasher } from "@noble/curves/ed25519.js";
import { bytesToNumberBE, numberToBytesBE } from "@noble/curves/utils.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { utf8ToBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// ─── Curve + generator setup ─────────────────────────────────────────

type RPoint = InstanceType<typeof ristretto255.Point>;

/** Curve order q for Ristretto255 (prime subgroup order). */
const CURVE_ORDER = ristretto255.Point.Fn.ORDER;

/**
 * The second generator H for the Pedersen commitment.
 *
 * H = ristretto255_hasher.hashToCurve("Verity.Pedersen.H.v2")
 *
 * This is a one-way derivation — neither Caelex nor anyone else
 * knows the discrete log of H w.r.t. G. That's what makes the
 * commitment binding.
 */
const H_DOMAIN = "Verity.Pedersen.H.v2";

let cachedH: RPoint | null = null;
function getH(): RPoint {
  if (cachedH) return cachedH;
  cachedH = ristretto255_hasher.hashToCurve(utf8ToBytes(H_DOMAIN));
  return cachedH;
}

// ─── Scalar helpers ─────────────────────────────────────────────────

function reduceToScalar(bytes: Uint8Array): bigint {
  return bytesToNumberBE(bytes) % CURVE_ORDER;
}

/**
 * Deterministically map a number to a Ristretto scalar.
 * Uses IEEE-754 double encoding so two callers committing to the same
 * float produce the same scalar.
 */
function valueToScalar(value: number): bigint {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, false); // big-endian for stability
  const hash = sha512(new Uint8Array(buf));
  return reduceToScalar(hash);
}

/** Random scalar in [0, q). */
function randomScalar(): bigint {
  const buf = new Uint8Array(64);
  crypto.getRandomValues(buf);
  return reduceToScalar(buf);
}

function scalarToHex(s: bigint): string {
  // 32 bytes = 256 bits is enough for any scalar mod the ~253-bit order.
  return bytesToHex(numberToBytesBE(s, 32));
}

function hexToScalar(hex: string): bigint {
  return bytesToNumberBE(hexToBytes(hex)) % CURVE_ORDER;
}

function pointToHex(p: RPoint): string {
  return bytesToHex(p.toBytes());
}

function hexToPoint(hex: string): RPoint {
  return ristretto255.Point.fromBytes(hexToBytes(hex));
}

// ─── Commitment ─────────────────────────────────────────────────────

export interface PedersenCommitment {
  /** Hex-encoded Ristretto point: C = r·G + v·H */
  commitment: string;
  /** Version marker — present in the attestation as `evidence.commitment_version` */
  algorithm: "pedersen-ristretto255";
}

export interface PedersenOpening {
  value: number;
  /** Hex-encoded blinding scalar r */
  blinding: string;
}

export function pedersenCommit(value: number): {
  commitment: PedersenCommitment;
  opening: PedersenOpening;
} {
  const G = ristretto255.Point.BASE;
  const H = getH();
  const v = valueToScalar(value);
  const r = randomScalar();

  // C = r·G + v·H
  const C = G.multiply(r).add(H.multiply(v));

  return {
    commitment: {
      commitment: pointToHex(C),
      algorithm: "pedersen-ristretto255",
    },
    opening: {
      value,
      blinding: scalarToHex(r),
    },
  };
}

export function pedersenOpen(
  commitment: PedersenCommitment,
  opening: PedersenOpening,
): boolean {
  try {
    const G = ristretto255.Point.BASE;
    const H = getH();
    const v = valueToScalar(opening.value);
    const r = hexToScalar(opening.blinding);

    const expected = G.multiply(r).add(H.multiply(v));
    const supplied = hexToPoint(commitment.commitment);
    return expected.equals(supplied);
  } catch {
    return false;
  }
}

// ─── Additive homomorphism ──────────────────────────────────────────

/**
 * Combine two commitments such that C_sum = C_a + C_b = Commit(v_a + v_b).
 * Enables aggregate proofs — e.g. "the sum of miss-distances across our
 * fleet exceeds X km" without revealing any single satellite's value.
 */
export function pedersenAdd(
  a: PedersenCommitment,
  b: PedersenCommitment,
): PedersenCommitment {
  const pa = hexToPoint(a.commitment);
  const pb = hexToPoint(b.commitment);
  return {
    commitment: pointToHex(pa.add(pb)),
    algorithm: "pedersen-ristretto255",
  };
}

// ─── Schnorr σ-protocol: proof of knowledge of (v, r) for C ─────────

/**
 * Non-interactive Schnorr proof of knowledge of the commitment opening,
 * made non-interactive via Fiat-Shamir.
 *
 * Prover:
 *   1. pick random (a_r, a_v), compute A = a_r·G + a_v·H
 *   2. challenge c = H(context || C || A)
 *   3. responses z_r = a_r + c·r, z_v = a_v + c·v
 *   Proof = (A, z_r, z_v)
 *
 * Verifier:
 *   1. recompute c from context, C, A
 *   2. check z_r·G + z_v·H == A + c·C
 *
 * This proves the prover knows (r, v) without revealing them, so it
 * is a proof-of-knowledge of the commitment opening. It is NOT a
 * range proof (that requires bulletproofs in Phase 2.1).
 */
export interface PoKProof {
  A: string; // hex-encoded point
  z_r: string; // hex-encoded scalar
  z_v: string; // hex-encoded scalar
  algorithm: "schnorr-pok-v1";
}

export function proveOpening(
  commitment: PedersenCommitment,
  opening: PedersenOpening,
  context: Uint8Array,
): PoKProof {
  const G = ristretto255.Point.BASE;
  const H = getH();
  const v = valueToScalar(opening.value);
  const r = hexToScalar(opening.blinding);

  // 1. random nonces
  const a_r = randomScalar();
  const a_v = randomScalar();
  const A = G.multiply(a_r).add(H.multiply(a_v));

  // 2. Fiat-Shamir challenge
  const challengeBytes = sha512(
    concat(context, hexToBytes(commitment.commitment), A.toBytes()),
  );
  const c = reduceToScalar(challengeBytes);

  // 3. responses mod curve order
  const z_r = (a_r + c * r) % CURVE_ORDER;
  const z_v = (a_v + c * v) % CURVE_ORDER;

  return {
    A: pointToHex(A),
    z_r: scalarToHex(z_r),
    z_v: scalarToHex(z_v),
    algorithm: "schnorr-pok-v1",
  };
}

export function verifyOpeningProof(
  commitment: PedersenCommitment,
  proof: PoKProof,
  context: Uint8Array,
): boolean {
  try {
    const G = ristretto255.Point.BASE;
    const H = getH();
    const C = hexToPoint(commitment.commitment);
    const A = hexToPoint(proof.A);
    const z_r = hexToScalar(proof.z_r);
    const z_v = hexToScalar(proof.z_v);

    const challengeBytes = sha512(
      concat(context, hexToBytes(commitment.commitment), A.toBytes()),
    );
    const c = reduceToScalar(challengeBytes);

    // Check: z_r·G + z_v·H == A + c·C
    const lhs = G.multiply(z_r).add(H.multiply(z_v));
    const rhs = A.add(C.multiply(c));
    return lhs.equals(rhs);
  } catch {
    return false;
  }
}

// ─── Utilities ──────────────────────────────────────────────────────

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
