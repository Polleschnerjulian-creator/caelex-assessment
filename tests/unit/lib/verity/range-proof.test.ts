// tests/unit/lib/verity/range-proof.test.ts

import { describe, it, expect } from "vitest";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import {
  proveNonNegative,
  verifyNonNegative,
  proveThreshold,
  verifyThreshold,
  commitScaledValue,
  type RangeEncoding,
  type ThresholdRangeProof,
} from "@/lib/verity/core/range-proof";
import { randomScalar } from "@/lib/verity/core/pedersen-provider";

const ctx = (s: string) => utf8ToBytes(s);

describe("Range proof — proveNonNegative / verifyNonNegative", () => {
  it("roundtrips at bits=8 with value=0", () => {
    const r = randomScalar();
    const proof = proveNonNegative(0n, r, 8, ctx("t1"));
    const value_scaled = 0n;
    // reconstruct C_d from (value, r) the same way prover did
    const { commitment_hex } = commitAndBlind(value_scaled, r);
    expect(verifyNonNegative(commitment_hex, proof, ctx("t1"))).toBe(true);
  });

  it("roundtrips at bits=8 with value=255 (max)", () => {
    const r = randomScalar();
    const proof = proveNonNegative(255n, r, 8, ctx("t2"));
    const { commitment_hex } = commitAndBlind(255n, r);
    expect(verifyNonNegative(commitment_hex, proof, ctx("t2"))).toBe(true);
  });

  it("roundtrips at bits=16 with value=65535 (max)", () => {
    const r = randomScalar();
    const proof = proveNonNegative(65535n, r, 16, ctx("t3"));
    const { commitment_hex } = commitAndBlind(65535n, r);
    expect(verifyNonNegative(commitment_hex, proof, ctx("t3"))).toBe(true);
  });

  it("roundtrips at bits=32 with a mid-range value", () => {
    const r = randomScalar();
    const v = 1_000_000n;
    const proof = proveNonNegative(v, r, 32, ctx("t4"));
    const { commitment_hex } = commitAndBlind(v, r);
    expect(verifyNonNegative(commitment_hex, proof, ctx("t4"))).toBe(true);
  });

  it("prover throws on valueInt >= 2^bits", () => {
    const r = randomScalar();
    expect(() => proveNonNegative(256n, r, 8, ctx("t5"))).toThrow(
      /out of range/,
    );
  });

  it("prover throws on negative valueInt", () => {
    const r = randomScalar();
    expect(() => proveNonNegative(-1n, r, 8, ctx("t6"))).toThrow(
      /non-negative/,
    );
  });

  it("prover throws on bits=0 and bits=53", () => {
    const r = randomScalar();
    expect(() => proveNonNegative(0n, r, 0, ctx("t7"))).toThrow();
    expect(() => proveNonNegative(0n, r, 53, ctx("t7"))).toThrow();
  });

  it("verifier rejects a different commitment hex", () => {
    const r = randomScalar();
    const proof = proveNonNegative(42n, r, 8, ctx("t8"));
    const other = commitAndBlind(43n, r).commitment_hex;
    expect(verifyNonNegative(other, proof, ctx("t8"))).toBe(false);
  });

  it("verifier rejects when context bytes differ", () => {
    const r = randomScalar();
    const proof = proveNonNegative(42n, r, 8, ctx("t9"));
    const { commitment_hex } = commitAndBlind(42n, r);
    expect(verifyNonNegative(commitment_hex, proof, ctx("OTHER"))).toBe(false);
  });

  it("verifier rejects when a bit_commitment is replaced with a random point", () => {
    const r = randomScalar();
    const proof = proveNonNegative(5n, r, 8, ctx("t10"));
    const { commitment_hex } = commitAndBlind(5n, r);
    // Replace first bit commitment with an unrelated scalar·G
    const forgedR = randomScalar();
    const forgedCommit = commitAndBlind(7n, forgedR).commitment_hex;
    const tampered = {
      ...proof,
      bit_commitments: [forgedCommit, ...proof.bit_commitments.slice(1)],
    };
    expect(verifyNonNegative(commitment_hex, tampered, ctx("t10"))).toBe(false);
  });

  it("verifier rejects when bit_proofs length does not match bits", () => {
    const r = randomScalar();
    const proof = proveNonNegative(5n, r, 8, ctx("t11"));
    const { commitment_hex } = commitAndBlind(5n, r);
    const tampered = { ...proof, bit_proofs: proof.bit_proofs.slice(0, 7) };
    expect(verifyNonNegative(commitment_hex, tampered, ctx("t11"))).toBe(false);
  });

  it("verifier rejects tampered consistency proof", () => {
    const r = randomScalar();
    const proof = proveNonNegative(5n, r, 8, ctx("t12"));
    const { commitment_hex } = commitAndBlind(5n, r);
    const cp = proof.consistency_proof;
    const flipped = (cp.z[0] === "f" ? "0" : "f") + cp.z.slice(1);
    const tampered = {
      ...proof,
      consistency_proof: { ...cp, z: flipped },
    };
    expect(verifyNonNegative(commitment_hex, tampered, ctx("t12"))).toBe(false);
  });

  it("verifier rejects tampered OR-proof (flip z_0 of bit 0)", () => {
    const r = randomScalar();
    const proof = proveNonNegative(5n, r, 8, ctx("t13"));
    const { commitment_hex } = commitAndBlind(5n, r);
    const bp = proof.bit_proofs[0]!;
    const flipped = (bp.z_0[0] === "f" ? "0" : "f") + bp.z_0.slice(1);
    const tampered = {
      ...proof,
      bit_proofs: [{ ...bp, z_0: flipped }, ...proof.bit_proofs.slice(1)],
    };
    expect(verifyNonNegative(commitment_hex, tampered, ctx("t13"))).toBe(false);
  });

  it("verifier rejects if a malicious prover commits to bit=2 instead of 0 or 1", () => {
    // Even with knowledge of valid (r, b=2), the CDS OR-proof cannot be
    // completed: neither C = r·G nor C − H = r·G holds. The prover cannot
    // forge the OR proof, so the verifier rejects. We simulate by swapping
    // in a fresh commitment to "2" with the same blinding as bit 0.
    const r = randomScalar();
    const proof = proveNonNegative(0n, r, 4, ctx("t14"));
    const { commitment_hex } = commitAndBlind(0n, r);
    // Overwrite bit 0's commitment to be a commitment to value 2.
    const bad = commitAndBlind(2n, randomScalar()).commitment_hex;
    const tampered = {
      ...proof,
      bit_commitments: [bad, ...proof.bit_commitments.slice(1)],
    };
    expect(verifyNonNegative(commitment_hex, tampered, ctx("t14"))).toBe(false);
  });

  it("produces a proof small enough to fit in an attestation JSON (<20 KB at bits=32)", () => {
    const r = randomScalar();
    const proof = proveNonNegative(1_234_567n, r, 32, ctx("t15"));
    const size = JSON.stringify(proof).length;
    expect(size).toBeLessThan(20_000);
  });

  it("algorithm tag is checked", () => {
    const r = randomScalar();
    const proof = proveNonNegative(5n, r, 8, ctx("t16"));
    const { commitment_hex } = commitAndBlind(5n, r);
    const tampered = { ...proof, algorithm: "other" as const };
    expect(
      verifyNonNegative(
        commitment_hex,
        tampered as unknown as typeof proof,
        ctx("t16"),
      ),
    ).toBe(false);
  });
});

describe("Range proof — proveThreshold / verifyThreshold", () => {
  const encoding: RangeEncoding = { scale: 100, bits: 32 };

  it("ABOVE roundtrip: v=57.66 ≥ T=15 verifies", () => {
    const { commitment_hex, blinding } = commitScaledValue(57.66, encoding);
    const proof = proveThreshold({
      actual_value: 57.66,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-1"),
    });
    expect(verifyThreshold(commitment_hex, proof, ctx("att-1"))).toBe(true);
  });

  it("BELOW roundtrip: v=5 ≤ T=25 verifies", () => {
    const { commitment_hex, blinding } = commitScaledValue(5, encoding);
    const proof = proveThreshold({
      actual_value: 5,
      threshold_value: 25,
      threshold_type: "BELOW",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-2"),
    });
    expect(verifyThreshold(commitment_hex, proof, ctx("att-2"))).toBe(true);
  });

  it("ABOVE prover throws when claim is false (v < T)", () => {
    const { blinding } = commitScaledValue(10, encoding);
    expect(() =>
      proveThreshold({
        actual_value: 10,
        threshold_value: 15,
        threshold_type: "ABOVE",
        commitment_blinding: blinding,
        encoding,
        context: ctx("att-3"),
      }),
    ).toThrow(/false/);
  });

  it("BELOW prover throws when claim is false (v > T)", () => {
    const { blinding } = commitScaledValue(30, encoding);
    expect(() =>
      proveThreshold({
        actual_value: 30,
        threshold_value: 25,
        threshold_type: "BELOW",
        commitment_blinding: blinding,
        encoding,
        context: ctx("att-4"),
      }),
    ).toThrow(/false/);
  });

  it("boundary: v == T verifies for ABOVE", () => {
    const { commitment_hex, blinding } = commitScaledValue(15, encoding);
    const proof = proveThreshold({
      actual_value: 15,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-5"),
    });
    expect(verifyThreshold(commitment_hex, proof, ctx("att-5"))).toBe(true);
  });

  it("boundary: v == T verifies for BELOW", () => {
    const { commitment_hex, blinding } = commitScaledValue(25, encoding);
    const proof = proveThreshold({
      actual_value: 25,
      threshold_value: 25,
      threshold_type: "BELOW",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-6"),
    });
    expect(verifyThreshold(commitment_hex, proof, ctx("att-6"))).toBe(true);
  });

  it("verifier rejects a flipped threshold_type", () => {
    const { commitment_hex, blinding } = commitScaledValue(50, encoding);
    const proof = proveThreshold({
      actual_value: 50,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-7"),
    });
    const tampered: ThresholdRangeProof = { ...proof, threshold_type: "BELOW" };
    expect(verifyThreshold(commitment_hex, tampered, ctx("att-7"))).toBe(false);
  });

  it("verifier rejects a swapped threshold_value_scaled", () => {
    const { commitment_hex, blinding } = commitScaledValue(50, encoding);
    const proof = proveThreshold({
      actual_value: 50,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-8"),
    });
    const tampered: ThresholdRangeProof = {
      ...proof,
      threshold_value_scaled: "1700",
    };
    expect(verifyThreshold(commitment_hex, tampered, ctx("att-8"))).toBe(false);
  });

  it("verifier rejects when context differs (cross-attestation replay)", () => {
    const { commitment_hex, blinding } = commitScaledValue(50, encoding);
    const proof = proveThreshold({
      actual_value: 50,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-A"),
    });
    expect(verifyThreshold(commitment_hex, proof, ctx("att-B"))).toBe(false);
  });

  it("verifier rejects an encoding mismatch (scale swapped)", () => {
    const { commitment_hex, blinding } = commitScaledValue(50, encoding);
    const proof = proveThreshold({
      actual_value: 50,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-9"),
    });
    const tampered: ThresholdRangeProof = {
      ...proof,
      encoding: { scale: 1000, bits: 32 },
    };
    expect(verifyThreshold(commitment_hex, tampered, ctx("att-9"))).toBe(false);
  });

  it("verifier rejects a range_proof.bits / encoding.bits mismatch", () => {
    const { commitment_hex, blinding } = commitScaledValue(50, encoding);
    const proof = proveThreshold({
      actual_value: 50,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding,
      context: ctx("att-10"),
    });
    const tampered: ThresholdRangeProof = {
      ...proof,
      encoding: { scale: 100, bits: 16 },
    };
    expect(verifyThreshold(commitment_hex, tampered, ctx("att-10"))).toBe(
      false,
    );
  });

  it("verifier rejects proof from attestation A moved to commitment of attestation B", () => {
    const { blinding: bA } = commitScaledValue(50, encoding);
    const { commitment_hex: cB } = commitScaledValue(60, encoding);
    const proofA = proveThreshold({
      actual_value: 50,
      threshold_value: 15,
      threshold_type: "ABOVE",
      commitment_blinding: bA,
      encoding,
      context: ctx("A"),
    });
    // Proof was built for commitment A's blinding, but we try to verify against B.
    expect(verifyThreshold(cB, proofA, ctx("A"))).toBe(false);
  });

  it("rejects non-positive / non-integer scale and out-of-bounds bits", () => {
    const { blinding } = commitScaledValue(50, { scale: 1, bits: 8 });
    expect(() =>
      proveThreshold({
        actual_value: 50,
        threshold_value: 15,
        threshold_type: "ABOVE",
        commitment_blinding: blinding,
        encoding: { scale: 0, bits: 8 },
        context: ctx("x"),
      }),
    ).toThrow();
    expect(() =>
      proveThreshold({
        actual_value: 50,
        threshold_value: 15,
        threshold_type: "ABOVE",
        commitment_blinding: blinding,
        encoding: { scale: 1, bits: 0 },
        context: ctx("x"),
      }),
    ).toThrow();
    expect(() =>
      proveThreshold({
        actual_value: 50,
        threshold_value: 15,
        threshold_type: "ABOVE",
        commitment_blinding: blinding,
        encoding: { scale: 1, bits: 53 },
        context: ctx("x"),
      }),
    ).toThrow();
  });

  it("rejects negative actual_value or threshold_value (MVP)", () => {
    const { blinding } = commitScaledValue(50, encoding);
    expect(() =>
      proveThreshold({
        actual_value: -1,
        threshold_value: 15,
        threshold_type: "ABOVE",
        commitment_blinding: blinding,
        encoding,
        context: ctx("x"),
      }),
    ).toThrow();
    expect(() =>
      proveThreshold({
        actual_value: 50,
        threshold_value: -1,
        threshold_type: "ABOVE",
        commitment_blinding: blinding,
        encoding,
        context: ctx("x"),
      }),
    ).toThrow();
  });

  it("handles float precision near scale boundary", () => {
    const enc: RangeEncoding = { scale: 1000, bits: 16 };
    const { commitment_hex, blinding } = commitScaledValue(0.001, enc);
    const proof = proveThreshold({
      actual_value: 0.001,
      threshold_value: 0,
      threshold_type: "ABOVE",
      commitment_blinding: blinding,
      encoding: enc,
      context: ctx("fp"),
    });
    expect(verifyThreshold(commitment_hex, proof, ctx("fp"))).toBe(true);
  });

  it("fuzz: 10 random valid ABOVE/BELOW claims all roundtrip", () => {
    for (let i = 0; i < 10; i++) {
      const v = Math.floor(Math.random() * 10_000);
      const T = Math.floor(Math.random() * 10_000);
      const type: "ABOVE" | "BELOW" = Math.random() < 0.5 ? "ABOVE" : "BELOW";
      const claim = type === "ABOVE" ? v >= T : v <= T;
      if (!claim) continue;
      const enc: RangeEncoding = { scale: 1, bits: 16 };
      const { commitment_hex, blinding } = commitScaledValue(v, enc);
      const proof = proveThreshold({
        actual_value: v,
        threshold_value: T,
        threshold_type: type,
        commitment_blinding: blinding,
        encoding: enc,
        context: ctx(`fuzz-${i}`),
      });
      expect(verifyThreshold(commitment_hex, proof, ctx(`fuzz-${i}`))).toBe(
        true,
      );
    }
  });
});

// ─── test helpers ──────────────────────────────────────────────────

/**
 * Mirror of the prover's internal commitment construction so tests
 * can reconstruct C_d from (valueInt, blinding) without reaching
 * into private helpers.
 */
function commitAndBlind(
  valueInt: bigint,
  blinding: bigint,
): { commitment_hex: string; blinding: bigint } {
  // Use commitScaledValue with scale=1 to get a Pedersen commitment to
  // the integer. But commitScaledValue takes a number, which would lose
  // precision for very large bigints — for our test cases (small ints)
  // that's fine. For robustness, use the public helper directly.
  const asNumber = Number(valueInt);
  if (!Number.isSafeInteger(asNumber)) {
    throw new Error("test helper: valueInt too large for Number()");
  }
  // We cannot inject `blinding` through commitScaledValue (it randomises).
  // Instead, rebuild the integer commitment by calling proveNonNegative on
  // (value, blinding) and reading the main commitment out of... actually,
  // the cleanest path is to use commitScaledValue and use *its* blinding.
  // Callers in the test file that need paired (value, blinding) should
  // obtain them together from commitScaledValue.
  //
  // The tests above pass `blinding` from a `randomScalar()` call and then
  // use commitAndBlind to derive the public commitment. For that path we
  // compute the commitment inline here using the same math as the module:
  //   C = blinding·G + valueInt·H
  // via a tiny re-implementation that only depends on exported helpers.
  const { commitment_hex } = manualCommit(valueInt, blinding);
  return { commitment_hex, blinding };
}

// Local mirror of commitInteger for tests — keeps us from exporting
// commitInteger purely for testability.
import { ristretto255 } from "@noble/curves/ed25519.js";
import {
  getH,
  pointToHex,
  CURVE_ORDER,
} from "@/lib/verity/core/pedersen-provider";

function manualCommit(
  valueInt: bigint,
  blinding: bigint,
): { commitment_hex: string } {
  const G = ristretto255.Point.BASE;
  const H = getH();
  const b = ((blinding % CURVE_ORDER) + CURVE_ORDER) % CURVE_ORDER;
  const v = ((valueInt % CURVE_ORDER) + CURVE_ORDER) % CURVE_ORDER;
  const rG = b === 0n ? G.multiply(1n).subtract(G.multiply(1n)) : G.multiply(b);
  const vH = v === 0n ? G.multiply(1n).subtract(G.multiply(1n)) : H.multiply(v);
  const C = rG.add(vH);
  return { commitment_hex: pointToHex(C) };
}
