/**
 * Verity Phase 2.1 — Zero-Knowledge Range Proof (Pillar B.1).
 *
 * Proves that a Pedersen commitment `C = r·G + v·H` hides an integer
 * value v in the range [0, 2^bits) — WITHOUT revealing v. Used to
 * turn the Verity ABOVE/BELOW threshold claim into a cryptographic
 * proof rather than a Caelex-signed assertion.
 *
 * Construction: bit-decomposition + Chaum-Damgård-Schoenmakers OR
 * proofs (Boudot 2000). Every sub-step is a Schnorr variant.
 *
 *   1. Decompose d into bits: d = Σᵢ bᵢ·2ⁱ, bᵢ ∈ {0,1}
 *   2. Commit to each bit: C_i = r_i·G + b_i·H
 *   3. For every C_i, prove b_i ∈ {0,1} via a disjunctive Schnorr
 *      OR-proof (prove "C_i = r·G" ∨ "C_i − H = r·G").
 *   4. Consistency: Σᵢ 2ⁱ·C_i − C_d = Δr·G. Schnorr-prove knowledge
 *      of Δr.
 *
 * This is structurally simpler than Bulletproofs (no inner-product
 * argument) at the cost of ~O(n) proof size instead of O(log n).
 * For n=32 that's ~12 KB of JSON — fine for attestation embedding.
 *
 * Threshold mapping (homomorphic, public):
 *   ABOVE (v ≥ T): C_d := C − T·H, range-prove d = v − T
 *   BELOW (v ≤ T): C_d := T·H − C, range-prove d = T − v
 *
 * Non-interactive via Fiat-Shamir. Challenges hash a transcript
 * prefix bound to (domain, caller context, bits, C_d, all C_i) so
 * proofs cannot be replayed across attestations or adaptively
 * manipulated sub-challenge by sub-challenge.
 *
 * Zero external dependencies — @noble/curves + @noble/hashes only.
 * No API calls, no paid services.
 */

import { ristretto255 } from "@noble/curves/ed25519.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import {
  CURVE_ORDER,
  concat,
  getH,
  hexToPoint,
  hexToScalar,
  pointToHex,
  randomScalar,
  reduceToScalar,
  scalarToHex,
  type RPoint,
} from "./pedersen-provider";

// ─── Types ──────────────────────────────────────────────────────────

export interface RangeEncoding {
  /** Fixed-point scale (e.g. 1000 for three-decimal precision). */
  scale: number;
  /** Number of bits in the proven range. Default 32. Max 52 (IEEE-754 mantissa safety). */
  bits: number;
}

/** Disjunctive Schnorr proof of b ∈ {0,1}. */
export interface DisjunctiveProof {
  T_0: string;
  T_1: string;
  e_0: string;
  e_1: string;
  z_0: string;
  z_1: string;
}

/** Schnorr proof of knowledge of x such that P = x·G. */
export interface SchnorrProof {
  T: string;
  z: string;
}

/** Proof that `C_d` commits to a non-negative integer in [0, 2^bits). */
export interface RangeProof {
  /** Bit-wise Pedersen commitments, LSB-first, length = bits. */
  bit_commitments: string[];
  /** Per-bit OR-proof, length = bits. */
  bit_proofs: DisjunctiveProof[];
  /** Proof tying the weighted bit sum to the caller's commitment. */
  consistency_proof: SchnorrProof;
  bits: number;
  algorithm: "bit-range-v1";
}

/** Proof that a Pedersen commitment C satisfies the ABOVE/BELOW threshold. */
export interface ThresholdRangeProof {
  threshold_type: "ABOVE" | "BELOW";
  /** Threshold value after fixed-point scaling, as a decimal string. */
  threshold_value_scaled: string;
  encoding: RangeEncoding;
  range_proof: RangeProof;
  algorithm: "threshold-range-v1";
}

// ─── Internal helpers ───────────────────────────────────────────────

const DOMAIN = utf8ToBytes("Verity.RangeProof.v1");
const G = ristretto255.Point.BASE;

function encodeUint32BE(n: number): Uint8Array {
  return new Uint8Array([
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ]);
}

function hashToScalar(...parts: Uint8Array[]): bigint {
  return reduceToScalar(sha512(concat(...parts)));
}

/** Scalar mult with 0-safety. */
function mul(p: RPoint, k: bigint): RPoint {
  const n = ((k % CURVE_ORDER) + CURVE_ORDER) % CURVE_ORDER;
  // ristretto255.Point.multiply(0n) returns the identity in @noble/curves v2,
  // but we special-case to avoid relying on that behaviour.
  if (n === 0n) return G.multiply(1n).subtract(G.multiply(1n));
  return p.multiply(n);
}

/** Homomorphic commit to a non-negative integer under our fixed (G, H). */
function commitInteger(valueInt: bigint, blinding: bigint): RPoint {
  if (valueInt < 0n) throw new Error("commitInteger: valueInt must be >= 0");
  const rG = mul(G, blinding);
  if (valueInt === 0n) return rG;
  const H = getH();
  return rG.add(mul(H, valueInt));
}

function commitBit(bit: 0 | 1, blinding: bigint): RPoint {
  const rG = mul(G, blinding);
  if (bit === 0) return rG;
  return rG.add(getH());
}

function buildTranscriptPrefix(
  bits: number,
  context: Uint8Array,
  C_d: RPoint,
  C_i: RPoint[],
): Uint8Array {
  return concat(
    DOMAIN,
    encodeUint32BE(bits),
    encodeUint32BE(context.length),
    context,
    C_d.toBytes(),
    ...C_i.map((c) => c.toBytes()),
  );
}

// ─── Disjunctive OR-proof: b ∈ {0,1} ────────────────────────────────

function proveBitOr(
  bit: 0 | 1,
  r: bigint,
  C: RPoint,
  transcriptPrefix: Uint8Array,
  bitIndex: number,
): DisjunctiveProof {
  const H = getH();
  const A_0 = C; // for b=0: C = r·G
  const A_1 = C.add(H.negate()); // for b=1: C − H = r·G

  let T_0: RPoint, T_1: RPoint;
  let e_0: bigint, e_1: bigint, z_0: bigint, z_1: bigint;

  if (bit === 0) {
    // Real branch: 0. Simulate branch 1.
    const t = randomScalar();
    T_0 = mul(G, t);
    e_1 = randomScalar();
    z_1 = randomScalar();
    // T_1 = z_1·G − e_1·A_1
    T_1 = mul(G, z_1).add(mul(A_1, e_1).negate());
    const e = hashToScalar(
      transcriptPrefix,
      encodeUint32BE(bitIndex),
      T_0.toBytes(),
      T_1.toBytes(),
    );
    e_0 = (e - e_1 + CURVE_ORDER) % CURVE_ORDER;
    z_0 = (t + e_0 * r) % CURVE_ORDER;
  } else {
    // Real branch: 1. Simulate branch 0.
    const t = randomScalar();
    T_1 = mul(G, t);
    e_0 = randomScalar();
    z_0 = randomScalar();
    T_0 = mul(G, z_0).add(mul(A_0, e_0).negate());
    const e = hashToScalar(
      transcriptPrefix,
      encodeUint32BE(bitIndex),
      T_0.toBytes(),
      T_1.toBytes(),
    );
    e_1 = (e - e_0 + CURVE_ORDER) % CURVE_ORDER;
    z_1 = (t + e_1 * r) % CURVE_ORDER;
  }

  return {
    T_0: pointToHex(T_0),
    T_1: pointToHex(T_1),
    e_0: scalarToHex(e_0),
    e_1: scalarToHex(e_1),
    z_0: scalarToHex(z_0),
    z_1: scalarToHex(z_1),
  };
}

function verifyBitOr(
  C: RPoint,
  proof: DisjunctiveProof,
  transcriptPrefix: Uint8Array,
  bitIndex: number,
): boolean {
  try {
    const H = getH();
    const T_0 = hexToPoint(proof.T_0);
    const T_1 = hexToPoint(proof.T_1);
    const e_0 = hexToScalar(proof.e_0);
    const e_1 = hexToScalar(proof.e_1);
    const z_0 = hexToScalar(proof.z_0);
    const z_1 = hexToScalar(proof.z_1);

    const A_0 = C;
    const A_1 = C.add(H.negate());

    const e = hashToScalar(
      transcriptPrefix,
      encodeUint32BE(bitIndex),
      T_0.toBytes(),
      T_1.toBytes(),
    );
    if ((e_0 + e_1) % CURVE_ORDER !== e) return false;

    // z_0·G == T_0 + e_0·A_0
    if (!mul(G, z_0).equals(T_0.add(mul(A_0, e_0)))) return false;
    // z_1·G == T_1 + e_1·A_1
    if (!mul(G, z_1).equals(T_1.add(mul(A_1, e_1)))) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── Schnorr DLOG proof: P = x·G ────────────────────────────────────

function proveSchnorrDLOG(
  x: bigint,
  P: RPoint,
  transcriptPrefix: Uint8Array,
): SchnorrProof {
  const t = randomScalar();
  const T = mul(G, t);
  const e = hashToScalar(
    transcriptPrefix,
    utf8ToBytes("consistency"),
    P.toBytes(),
    T.toBytes(),
  );
  const z = (t + e * x) % CURVE_ORDER;
  return { T: pointToHex(T), z: scalarToHex(z) };
}

function verifySchnorrDLOG(
  P: RPoint,
  proof: SchnorrProof,
  transcriptPrefix: Uint8Array,
): boolean {
  try {
    const T = hexToPoint(proof.T);
    const z = hexToScalar(proof.z);
    const e = hashToScalar(
      transcriptPrefix,
      utf8ToBytes("consistency"),
      P.toBytes(),
      T.toBytes(),
    );
    return mul(G, z).equals(T.add(mul(P, e)));
  } catch {
    return false;
  }
}

// ─── Public: non-negative range proof ───────────────────────────────

export function proveNonNegative(
  valueInt: bigint,
  blindingR: bigint,
  bits: number,
  context: Uint8Array,
): RangeProof {
  if (!Number.isInteger(bits) || bits < 1 || bits > 52) {
    throw new Error("proveNonNegative: bits must be integer in [1, 52]");
  }
  if (valueInt < 0n) {
    throw new Error("proveNonNegative: valueInt must be non-negative");
  }
  if (valueInt >= 1n << BigInt(bits)) {
    throw new Error(`proveNonNegative: valueInt out of range [0, 2^${bits})`);
  }

  // 1. Bit decomposition (LSB-first)
  const b: (0 | 1)[] = [];
  {
    let t = valueInt;
    for (let i = 0; i < bits; i++) {
      b.push(Number(t & 1n) as 0 | 1);
      t >>= 1n;
    }
  }

  // 2. Commit to each bit
  const r_i: bigint[] = new Array(bits);
  const C_i: RPoint[] = new Array(bits);
  for (let i = 0; i < bits; i++) {
    r_i[i] = randomScalar();
    C_i[i] = commitBit(b[i]!, r_i[i]!);
  }

  // 3. Main commitment (the one we're proving non-negativity of)
  const C_d = commitInteger(valueInt, blindingR);

  const prefix = buildTranscriptPrefix(bits, context, C_d, C_i);

  // 4. OR-proof per bit
  const bit_proofs: DisjunctiveProof[] = new Array(bits);
  for (let i = 0; i < bits; i++) {
    bit_proofs[i] = proveBitOr(b[i]!, r_i[i]!, C_i[i]!, prefix, i);
  }

  // 5. Consistency: P = Σᵢ 2ⁱ·C_i − C_d = Δr·G
  let sumRi = 0n;
  let weightedSumC: RPoint | null = null;
  for (let i = 0; i < bits; i++) {
    const weight = 1n << BigInt(i);
    sumRi = (sumRi + weight * r_i[i]!) % CURVE_ORDER;
    const wC = mul(C_i[i]!, weight);
    weightedSumC = weightedSumC === null ? wC : weightedSumC.add(wC);
  }
  const deltaR = (sumRi - blindingR + CURVE_ORDER) % CURVE_ORDER;
  const P = weightedSumC!.add(C_d.negate());
  const consistency_proof = proveSchnorrDLOG(deltaR, P, prefix);

  return {
    bit_commitments: C_i.map(pointToHex),
    bit_proofs,
    consistency_proof,
    bits,
    algorithm: "bit-range-v1",
  };
}

export function verifyNonNegative(
  commitmentC_d_hex: string,
  proof: RangeProof,
  context: Uint8Array,
): boolean {
  try {
    if (proof.algorithm !== "bit-range-v1") return false;
    if (!Number.isInteger(proof.bits) || proof.bits < 1 || proof.bits > 52) {
      return false;
    }
    if (
      proof.bit_commitments.length !== proof.bits ||
      proof.bit_proofs.length !== proof.bits
    ) {
      return false;
    }

    const C_d = hexToPoint(commitmentC_d_hex);
    const C_i: RPoint[] = proof.bit_commitments.map(hexToPoint);
    const prefix = buildTranscriptPrefix(proof.bits, context, C_d, C_i);

    // Verify each OR-proof
    for (let i = 0; i < proof.bits; i++) {
      if (!verifyBitOr(C_i[i]!, proof.bit_proofs[i]!, prefix, i)) return false;
    }

    // Verify consistency: P = Σᵢ 2ⁱ·C_i − C_d
    let weightedSumC: RPoint | null = null;
    for (let i = 0; i < proof.bits; i++) {
      const weight = 1n << BigInt(i);
      const wC = mul(C_i[i]!, weight);
      weightedSumC = weightedSumC === null ? wC : weightedSumC.add(wC);
    }
    const P = weightedSumC!.add(C_d.negate());
    if (!verifySchnorrDLOG(P, proof.consistency_proof, prefix)) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── Public: threshold-bound range proof ────────────────────────────

function buildThresholdContext(
  base: Uint8Array,
  tType: "ABOVE" | "BELOW",
  T_scaled: bigint,
  encoding: RangeEncoding,
): Uint8Array {
  return concat(
    base,
    utf8ToBytes(
      `|v3|ttype:${tType}|tval:${T_scaled.toString()}|scale:${encoding.scale}|bits:${encoding.bits}`,
    ),
  );
}

/**
 * Prove that the Pedersen commitment
 *     C = commitment_blinding·G + scaled(actual_value)·H
 * satisfies the threshold claim (ABOVE: v ≥ T, BELOW: v ≤ T) without
 * revealing actual_value.
 *
 * The caller must have built C using the SAME integer encoding
 * (`Math.round(value * encoding.scale)` as a BigInt). Floats are not
 * committed directly — always the scaled integer.
 */
export function proveThreshold(params: {
  actual_value: number;
  threshold_value: number;
  threshold_type: "ABOVE" | "BELOW";
  commitment_blinding: bigint;
  encoding: RangeEncoding;
  context: Uint8Array;
}): ThresholdRangeProof {
  const {
    actual_value,
    threshold_value,
    threshold_type,
    commitment_blinding,
    encoding,
    context,
  } = params;

  if (!Number.isInteger(encoding.scale) || encoding.scale <= 0) {
    throw new Error(
      "proveThreshold: encoding.scale must be a positive integer",
    );
  }
  if (
    !Number.isInteger(encoding.bits) ||
    encoding.bits < 1 ||
    encoding.bits > 52
  ) {
    throw new Error("proveThreshold: encoding.bits must be integer in [1, 52]");
  }
  if (!Number.isFinite(actual_value) || actual_value < 0) {
    throw new Error(
      "proveThreshold: actual_value must be finite and non-negative",
    );
  }
  if (!Number.isFinite(threshold_value) || threshold_value < 0) {
    throw new Error(
      "proveThreshold: threshold_value must be finite and non-negative (MVP)",
    );
  }

  const v_scaled = BigInt(Math.round(actual_value * encoding.scale));
  const T_scaled = BigInt(Math.round(threshold_value * encoding.scale));

  let d_scaled: bigint;
  let blindingForCd: bigint;
  if (threshold_type === "ABOVE") {
    if (v_scaled < T_scaled) {
      throw new Error("proveThreshold: ABOVE claim is false (v < T)");
    }
    d_scaled = v_scaled - T_scaled;
    // C_d = C − T·H → same blinding as C.
    blindingForCd = commitment_blinding;
  } else {
    if (v_scaled > T_scaled) {
      throw new Error("proveThreshold: BELOW claim is false (v > T)");
    }
    d_scaled = T_scaled - v_scaled;
    // C_d = T·H − C = −r·G + d·H → blinding is −r.
    blindingForCd = (CURVE_ORDER - commitment_blinding) % CURVE_ORDER;
  }

  const extContext = buildThresholdContext(
    context,
    threshold_type,
    T_scaled,
    encoding,
  );
  const range_proof = proveNonNegative(
    d_scaled,
    blindingForCd,
    encoding.bits,
    extContext,
  );

  return {
    threshold_type,
    threshold_value_scaled: T_scaled.toString(),
    encoding,
    range_proof,
    algorithm: "threshold-range-v1",
  };
}

export function verifyThreshold(
  commitmentC_hex: string,
  proof: ThresholdRangeProof,
  context: Uint8Array,
): boolean {
  try {
    if (proof.algorithm !== "threshold-range-v1") return false;
    if (proof.range_proof.bits !== proof.encoding.bits) return false;

    const H = getH();
    const C = hexToPoint(commitmentC_hex);
    const T_scaled = BigInt(proof.threshold_value_scaled);

    let C_d: RPoint;
    if (proof.threshold_type === "ABOVE") {
      C_d = C.add(mul(H, T_scaled).negate());
    } else if (proof.threshold_type === "BELOW") {
      C_d = mul(H, T_scaled).add(C.negate());
    } else {
      return false;
    }

    const extContext = buildThresholdContext(
      context,
      proof.threshold_type,
      T_scaled,
      proof.encoding,
    );
    return verifyNonNegative(pointToHex(C_d), proof.range_proof, extContext);
  } catch {
    return false;
  }
}

// ─── Convenience: build a Pedersen commitment on an integer-encoded value ───

/**
 * Helper for callers building the main commitment C that a
 * ThresholdRangeProof will later prove claims about.
 *
 * Returns the commitment and the blinding scalar. The caller must
 * retain the blinding scalar to construct the proof; once the proof
 * is emitted, the blinding is discarded (same hygiene rule as v2).
 */
export function commitScaledValue(
  actual_value: number,
  encoding: RangeEncoding,
): { commitment_hex: string; blinding: bigint; value_scaled: bigint } {
  if (!Number.isInteger(encoding.scale) || encoding.scale <= 0) {
    throw new Error("commitScaledValue: scale must be positive integer");
  }
  if (!Number.isFinite(actual_value) || actual_value < 0) {
    throw new Error("commitScaledValue: value must be finite and non-negative");
  }
  const value_scaled = BigInt(Math.round(actual_value * encoding.scale));
  const blinding = randomScalar();
  const C = commitInteger(value_scaled, blinding);
  return {
    commitment_hex: pointToHex(C),
    blinding,
    value_scaled,
  };
}
