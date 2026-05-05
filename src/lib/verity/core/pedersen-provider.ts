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
 * T2-CRYPTO-1 (audit fix 2026-05-05): values are encoded as
 * INTEGERS — `valueToScalar(v: bigint) = v mod q` — to preserve the
 * additive homomorphism that the doc-comment promises. The previous
 * SHA-512 mapping was non-linear (H(a) + H(b) ≠ H(a + b)), so
 * `pedersenAdd` produced commitments with no useful opening. Callers
 * with fractional measurements (fuel %, miss-distance km, etc.) must
 * use `commitScaled(value, scale)` which scales to an integer first
 * — matching how the v3 range proof has always done it.
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

export type RPoint = InstanceType<typeof ristretto255.Point>;

/** Curve order q for Ristretto255 (prime subgroup order). */
export const CURVE_ORDER = ristretto255.Point.Fn.ORDER;

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
export function getH(): RPoint {
  if (cachedH) return cachedH;
  cachedH = ristretto255_hasher.hashToCurve(utf8ToBytes(H_DOMAIN));
  return cachedH;
}

// ─── Scalar helpers ─────────────────────────────────────────────────

export function reduceToScalar(bytes: Uint8Array): bigint {
  return bytesToNumberBE(bytes) % CURVE_ORDER;
}

/**
 * Map an integer value to a Ristretto scalar in [0, q) preserving
 * additive linearity:
 *   valueToScalar(a) + valueToScalar(b) ≡ valueToScalar(a + b) (mod q)
 *
 * T2-CRYPTO-1 (audit fix 2026-05-05): the previous implementation
 * used `SHA-512(IEEE-754(value))` which broke linearity, making the
 * documented `pedersenAdd` homomorphism a no-op. Direct integer
 * encoding restores it. Fractional measurements should be scaled to
 * an integer first via `commitScaled`.
 */
function valueToScalar(value: bigint): bigint {
  // Normalise into [0, q). Negative values fold into the positive
  // residue class via a single addition of CURVE_ORDER.
  return ((value % CURVE_ORDER) + CURVE_ORDER) % CURVE_ORDER;
}

/**
 * Compute `s·P` returning the identity for s = 0.
 *
 * @noble/curves rejects scalar 0 with `expected 1 <= sc < curve.n`,
 * which the previous SHA-512-based valueToScalar happened to dodge
 * because the hash output is essentially never 0. Now that the
 * mapping is linear, value 0 (and the rare r=0) reach this code
 * path legitimately. Identity-as-fallback preserves the algebra:
 * `0·P = O` for any P, and adding O is a no-op.
 */
function safeMul(point: RPoint, scalar: bigint): RPoint {
  if (scalar === 0n) return ristretto255.Point.ZERO;
  return point.multiply(scalar);
}

/** Random scalar in [0, q). */
export function randomScalar(): bigint {
  const buf = new Uint8Array(64);
  crypto.getRandomValues(buf);
  return reduceToScalar(buf);
}

export function scalarToHex(s: bigint): string {
  // 32 bytes = 256 bits is enough for any scalar mod the ~253-bit order.
  return bytesToHex(numberToBytesBE(s, 32));
}

export function hexToScalar(hex: string): bigint {
  return bytesToNumberBE(hexToBytes(hex)) % CURVE_ORDER;
}

export function pointToHex(p: RPoint): string {
  return bytesToHex(p.toBytes());
}

export function hexToPoint(hex: string): RPoint {
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
  /**
   * Committed integer value as a decimal string (so JSON round-trips
   * are exact for values larger than 2^53). Always non-negative; the
   * scaling done by `commitScaled` ensures fractional measurements
   * become positive integers before commit.
   */
  value: string;
  /** Hex-encoded blinding scalar r */
  blinding: string;
}

/**
 * Commit to an integer value `v ∈ [0, q)`.
 *
 * T2-CRYPTO-1: callers with fractional measurements MUST use
 * `commitScaled` instead — the bare integer API exists so the
 * homomorphism `pedersenAdd(C(a), C(b)) = C(a + b)` is unambiguous
 * about its scalar arithmetic.
 *
 * Accepts `bigint` or `number` (number must be a finite non-negative
 * integer; throws otherwise).
 */
export function pedersenCommit(value: number | bigint): {
  commitment: PedersenCommitment;
  opening: PedersenOpening;
} {
  const v_int = normaliseInteger(value);
  const G = ristretto255.Point.BASE;
  const H = getH();
  const v = valueToScalar(v_int);
  const r = randomScalar();

  // C = r·G + v·H
  const C = safeMul(G, r).add(safeMul(H, v));

  return {
    commitment: {
      commitment: pointToHex(C),
      algorithm: "pedersen-ristretto255",
    },
    opening: {
      value: v_int.toString(),
      blinding: scalarToHex(r),
    },
  };
}

/**
 * T2-CRYPTO-1: commit to `Math.round(value * scale)` so a
 * fractional measurement becomes a non-negative integer that the
 * homomorphism actually preserves.
 *
 * Mirrors `commitScaledValue` from `range-proof.ts:435-450`. Pick
 * `scale = 1000` for three decimal places (the v3 default).
 */
export function commitScaled(
  value: number,
  scale: number,
): {
  commitment: PedersenCommitment;
  opening: PedersenOpening;
} {
  if (!Number.isInteger(scale) || scale <= 0) {
    throw new Error("commitScaled: scale must be a positive integer");
  }
  if (!Number.isFinite(value)) {
    throw new Error("commitScaled: value must be finite");
  }
  if (value < 0) {
    throw new Error(
      "commitScaled: value must be non-negative (Pedersen scalar requires positive integer)",
    );
  }
  return pedersenCommit(BigInt(Math.round(value * scale)));
}

function normaliseInteger(value: number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (!Number.isFinite(value)) {
    throw new Error("pedersenCommit: value must be finite");
  }
  if (!Number.isInteger(value)) {
    throw new Error(
      "pedersenCommit: value must be an integer; use commitScaled for fractional inputs",
    );
  }
  return BigInt(value);
}

export function pedersenOpen(
  commitment: PedersenCommitment,
  opening: PedersenOpening,
): boolean {
  try {
    const G = ristretto255.Point.BASE;
    const H = getH();
    // T2-CRYPTO-1: opening.value is a decimal-string integer; parse
    // through BigInt so values larger than 2^53 round-trip exactly.
    const v = valueToScalar(BigInt(opening.value));
    const r = hexToScalar(opening.blinding);

    const expected = safeMul(G, r).add(safeMul(H, v));
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
  // T2-CRYPTO-1: opening.value is a decimal-string integer.
  const v = valueToScalar(BigInt(opening.value));
  const r = hexToScalar(opening.blinding);

  // 1. random nonces
  const a_r = randomScalar();
  const a_v = randomScalar();
  const A = safeMul(G, a_r).add(safeMul(H, a_v));

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
    const lhs = safeMul(G, z_r).add(safeMul(H, z_v));
    const rhs = A.add(safeMul(C, c));
    return lhs.equals(rhs);
  } catch {
    return false;
  }
}

// ─── Utilities ──────────────────────────────────────────────────────

export function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
