import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  generateAttestation,
  verifyAttestation,
} from "@/lib/verity/core/attestation";
import type {
  GenerateAttestationParams,
  ThresholdAttestation,
} from "@/lib/verity/core/types";

let pubKeyHex: string;
let privKeyDer: Buffer;

beforeAll(() => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  pubKeyHex = publicKey.export({ type: "spki", format: "der" }).toString("hex");
  privKeyDer = privateKey.export({ type: "pkcs8", format: "der" }) as Buffer;
});

function makeParams(
  overrides?: Partial<GenerateAttestationParams>,
): GenerateAttestationParams {
  return {
    regulation_ref: "eu_space_act_art_70",
    regulation_name: "End-of-Life Passivation Readiness",
    threshold_type: "ABOVE",
    threshold_value: 15,
    actual_value: 57.66,
    data_point: "remaining_fuel_pct",
    claim_statement: "Fuel reserve exceeds Art. 70 passivation threshold (15%)",
    subject: {
      operator_id: "op_123",
      satellite_norad_id: "58421",
      satellite_name: "CAELEX-SAT-1",
    },
    evidence_source: "sentinel",
    trust_score: 0.98,
    collected_at: "2026-03-15T14:32:07.000Z",
    sentinel_anchor: {
      sentinel_id: "sent_abc",
      chain_position: 42,
      chain_hash: "abc123",
      collected_at: "2026-03-15T14:32:07.000Z",
    },
    cross_verification: null,
    issuer_key_id: "verity-2026-03-01",
    issuer_private_key_der: privKeyDer,
    issuer_public_key_hex: pubKeyHex,
    expires_in_days: 90,
    ...overrides,
  };
}

describe("generateAttestation", () => {
  it("generates a valid attestation", () => {
    const att = generateAttestation(makeParams());
    expect(att.attestation_id).toMatch(/^va_/);
    expect(att.version).toBe("1.0");
    expect(att.claim.result).toBe(true);
    expect(att.signature).toBeTruthy();
  });

  it("evaluates ABOVE threshold correctly", () => {
    const att = generateAttestation(
      makeParams({ actual_value: 57.66, threshold_value: 15 }),
    );
    expect(att.claim.result).toBe(true);
  });

  it("evaluates BELOW threshold correctly", () => {
    const att = generateAttestation(
      makeParams({
        threshold_type: "BELOW",
        threshold_value: 25,
        actual_value: 10,
      }),
    );
    expect(att.claim.result).toBe(true);
  });

  it("returns false when threshold not met", () => {
    const att = generateAttestation(
      makeParams({ actual_value: 5, threshold_value: 15 }),
    );
    expect(att.claim.result).toBe(false);
  });

  it("NEVER contains actual_value in the attestation", () => {
    const att = generateAttestation(makeParams());
    const json = JSON.stringify(att);
    expect(json).not.toContain("57.66");
    expect(json).not.toContain("actual_value");
  });

  it("NEVER contains trust_score float in the attestation", () => {
    const att = generateAttestation(makeParams({ trust_score: 0.9372 }));
    const json = JSON.stringify(att);
    // The exact float should not appear anywhere — only the mapped level
    expect(json).not.toContain("0.9372");
    expect(json).not.toContain("trust_score");
    expect(att.evidence.trust_level).toBe("HIGH");
  });

  it("includes a value commitment hash", () => {
    const att = generateAttestation(makeParams());
    expect(att.evidence.value_commitment).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("maps trust score to level", () => {
    const high = generateAttestation(makeParams({ trust_score: 0.95 }));
    expect(high.evidence.trust_level).toBe("HIGH");

    const medium = generateAttestation(makeParams({ trust_score: 0.75 }));
    expect(medium.evidence.trust_level).toBe("MEDIUM");

    const low = generateAttestation(makeParams({ trust_score: 0.55 }));
    expect(low.evidence.trust_level).toBe("LOW");
  });

  it("does not include verification_url in signed fields", () => {
    const att = generateAttestation(makeParams());
    expect(att.verification_url).toBeTruthy();
    // verification_url is present but unsigned
  });
});

describe("verifyAttestation", () => {
  it("verifies a valid attestation", () => {
    const att = generateAttestation(makeParams());
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails with wrong public key", () => {
    const att = generateAttestation(makeParams());
    const { publicKey: otherPub } = generateKeyPairSync("ed25519");
    const otherHex = otherPub
      .export({ type: "spki", format: "der" })
      .toString("hex");
    const result = verifyAttestation(att, otherHex, true);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Issuer public key mismatch");
  });

  it("fails when issuer_known is false", () => {
    const att = generateAttestation(makeParams());
    const result = verifyAttestation(att, pubKeyHex, false);
    expect(result.valid).toBe(false);
    expect(result.checks.issuer_known).toBe(false);
  });

  it("fails for expired attestation", () => {
    const att = generateAttestation(makeParams({ expires_in_days: 0 }));
    // Force expires_at to the past
    att.expires_at = new Date(Date.now() - 86400000).toISOString();
    // Re-sign needed, but since we tamper after signing, sig will also fail
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.checks.not_expired).toBe(false);
  });

  it("fails for tampered claim", () => {
    const att = generateAttestation(makeParams());
    att.claim.result = !att.claim.result; // Tamper
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("fails for tampered issuer name", () => {
    const att = generateAttestation(makeParams());
    (att.issuer as { name: string }).name = "FakeCaelex";
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
  });

  it("stays valid when verification_url changes (unsigned)", () => {
    const att = generateAttestation(makeParams());
    att.verification_url = "https://new-domain.com/verify";
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(true);
  });

  it("returns all errors, not just the first", () => {
    const att = generateAttestation(makeParams());
    att.claim.result = !att.claim.result;
    att.expires_at = new Date(Date.now() - 86400000).toISOString();
    const result = verifyAttestation(att, pubKeyHex, false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ─── v2 — Pedersen commitment + Schnorr PoK ────────────────────────────────

describe("generateAttestation — v2 (Pedersen)", () => {
  it("emits version 2.0 with pedersen: prefix and a PoK proof", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    expect(att.version).toBe("2.0");
    expect(att.evidence.value_commitment).toMatch(/^pedersen:[a-f0-9]{64}$/);
    expect(att.evidence.commitment_scheme).toBe("v2-pedersen-ristretto255");
    expect(att.evidence.commitment_proof?.algorithm).toBe("schnorr-pok-v1");
    expect(att.evidence.commitment_proof?.A).toMatch(/^[a-f0-9]{64}$/);
    expect(att.evidence.commitment_proof?.z_r).toMatch(/^[a-f0-9]+$/);
    expect(att.evidence.commitment_proof?.z_v).toMatch(/^[a-f0-9]+$/);
  });

  it("still hides actual_value", () => {
    const att = generateAttestation(
      makeParams({ commitment_scheme: "v2", actual_value: 57.66 }),
    );
    const json = JSON.stringify(att);
    expect(json).not.toContain("57.66");
    expect(json).not.toContain("actual_value");
  });

  it("produces different commitments for the same value (hiding via blinding)", () => {
    const a = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    const b = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    expect(a.evidence.value_commitment).not.toBe(b.evidence.value_commitment);
  });

  it("defaults to v1 when commitment_scheme is omitted (backwards-compat)", () => {
    const att = generateAttestation(makeParams());
    expect(att.version).toBe("1.0");
    expect(att.evidence.value_commitment.startsWith("sha256:")).toBe(true);
    expect(att.evidence.commitment_proof).toBeUndefined();
  });
});

describe("verifyAttestation — v2 (Pedersen)", () => {
  it("verifies a valid v2 attestation end-to-end", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.checks.commitment_proof_valid).toBe(true);
  });

  it("rejects a v2 attestation with a tampered commitment point", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    // Flip the first hex byte of the commitment point.
    const prefix = "pedersen:";
    const hex = att.evidence.value_commitment.slice(prefix.length);
    const tampered = prefix + (hex[0] === "f" ? "0" : "f") + hex.slice(1);
    (att.evidence as { value_commitment: string }).value_commitment = tampered;
    const result = verifyAttestation(att, pubKeyHex, true);
    // Signature check catches this first (evidence is signed).
    expect(result.valid).toBe(false);
  });

  it("rejects a v2 attestation with a tampered PoK (A component)", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    const proof = att.evidence.commitment_proof!;
    proof.A = (proof.A[0] === "f" ? "0" : "f") + proof.A.slice(1);
    const result = verifyAttestation(att, pubKeyHex, true);
    // Signature fails first because commitment_proof is signed.
    expect(result.valid).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("rejects a v2 attestation with the commitment_proof stripped", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    delete (att.evidence as { commitment_proof?: unknown }).commitment_proof;
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects a v1-prefixed commitment claimed as v2", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v2" }));
    // Spoof: keep v2 version + proof, but switch the prefix to sha256:
    att.evidence.value_commitment = "sha256:" + "00".repeat(32);
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects a v1 attestation that smuggles a commitment_proof field", () => {
    const att = generateAttestation(makeParams()); // v1
    (att.evidence as { commitment_proof: unknown }).commitment_proof = {
      A: "00".repeat(32),
      z_r: "00".repeat(32),
      z_v: "00".repeat(32),
      algorithm: "schnorr-pok-v1",
    };
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects an unknown version", () => {
    const att = generateAttestation(makeParams());
    (att as { version: string }).version = "9.9";
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("PoK is bound to the attestation — swapping proofs between attestations fails", () => {
    // Two v2 attestations with different claims.
    const attA = generateAttestation(
      makeParams({ commitment_scheme: "v2", threshold_value: 15 }),
    );
    const attB = generateAttestation(
      makeParams({ commitment_scheme: "v2", threshold_value: 99 }),
    );
    // Move attA's proof onto attB (but keep B's commitment).
    attB.evidence.commitment_proof = attA.evidence.commitment_proof;
    // Signature catches this (proof is part of signed evidence).
    const result = verifyAttestation(attB, pubKeyHex, true);
    expect(result.valid).toBe(false);
  });

  it("v1 attestations still verify after the type widen (regression)", () => {
    // Simulate a v1 attestation that was signed before the upgrade landed.
    const att = generateAttestation(makeParams());
    expect(att.version).toBe("1.0");
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(true);
    // v1 path reports commitment_proof_valid=true unconditionally (nothing to check).
    expect(result.checks.commitment_proof_valid).toBe(true);
    expect(result.checks.range_proof_valid).toBe(true);
  });
});

// ─── v3 — Pedersen + zero-knowledge range proof ────────────────────────────

describe("generateAttestation — v3 (range proof)", () => {
  it("emits version 3.0 with pedersen: prefix and a range_proof", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v3" }));
    expect(att.version).toBe("3.0");
    expect(att.evidence.value_commitment).toMatch(/^pedersen:[a-f0-9]{64}$/);
    expect(att.evidence.commitment_scheme).toBe("v3-pedersen-range");
    expect(att.evidence.commitment_proof).toBeUndefined();
    expect(att.evidence.range_proof?.algorithm).toBe("threshold-range-v1");
    expect(att.evidence.range_proof?.range_proof.algorithm).toBe(
      "bit-range-v1",
    );
    // Default encoding is scale=1000 bits=32.
    expect(att.evidence.range_proof?.encoding).toEqual({
      scale: 1000,
      bits: 32,
    });
  });

  it("still hides actual_value", () => {
    const att = generateAttestation(
      makeParams({ commitment_scheme: "v3", actual_value: 57.66 }),
    );
    const json = JSON.stringify(att);
    expect(json).not.toContain("57.66");
    expect(json).not.toContain("actual_value");
  });

  it("respects a custom range_encoding", () => {
    const att = generateAttestation(
      makeParams({
        commitment_scheme: "v3",
        range_encoding: { scale: 100, bits: 16 },
        actual_value: 57.66,
        threshold_value: 15,
        threshold_type: "ABOVE",
      }),
    );
    expect(att.evidence.range_proof?.encoding).toEqual({
      scale: 100,
      bits: 16,
    });
  });

  it("throws when the ABOVE claim is actually false", () => {
    expect(() =>
      generateAttestation(
        makeParams({
          commitment_scheme: "v3",
          actual_value: 10,
          threshold_type: "ABOVE",
          threshold_value: 15,
        }),
      ),
    ).toThrow(/false/);
  });

  it("throws when the BELOW claim is actually false", () => {
    expect(() =>
      generateAttestation(
        makeParams({
          commitment_scheme: "v3",
          actual_value: 30,
          threshold_type: "BELOW",
          threshold_value: 25,
        }),
      ),
    ).toThrow(/false/);
  });
});

describe("verifyAttestation — v3 (range proof)", () => {
  it("verifies a valid v3 attestation end-to-end", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v3" }));
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.checks.range_proof_valid).toBe(true);
    expect(result.checks.commitment_proof_valid).toBe(true); // unconditional in v3
  });

  it("rejects a v3 attestation with range_proof stripped", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v3" }));
    delete (att.evidence as { range_proof?: unknown }).range_proof;
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects a v3 attestation that smuggles a commitment_proof field", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v3" }));
    (att.evidence as { commitment_proof: unknown }).commitment_proof = {
      A: "00".repeat(32),
      z_r: "00".repeat(32),
      z_v: "00".repeat(32),
      algorithm: "schnorr-pok-v1",
    };
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects a v3 attestation with tampered threshold_value_scaled", () => {
    const att = generateAttestation(
      makeParams({
        commitment_scheme: "v3",
        actual_value: 57.66,
        threshold_value: 15,
        threshold_type: "ABOVE",
      }),
    );
    // Lower the stored threshold to pretend the commitment clears an
    // even weaker bar. Because range_proof lives in signed evidence,
    // the Ed25519 signature catches this first.
    att.evidence.range_proof!.threshold_value_scaled = "10000";
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("rejects when range_proof.threshold_type disagrees with claim.threshold_type", () => {
    // Manually construct an unsigned attestation where the claim says ABOVE
    // but the range_proof.threshold_type was swapped. Since the sig covers
    // both, we expect sig failure — and even if sig were bypassed, the
    // dedicated consistency check in verifyAttestation catches it.
    const att = generateAttestation(makeParams({ commitment_scheme: "v3" }));
    att.evidence.range_proof!.threshold_type =
      att.claim.threshold_type === "ABOVE" ? "BELOW" : "ABOVE";
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(false);
  });

  it("rejects a v3 attestation with a tampered OR-proof bit", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v3" }));
    const bp = att.evidence.range_proof!.range_proof.bit_proofs[0]!;
    bp.z_0 = (bp.z_0[0] === "f" ? "0" : "f") + bp.z_0.slice(1);
    const result = verifyAttestation(att, pubKeyHex, true);
    // Ed25519 catches it (evidence is signed as a whole).
    expect(result.valid).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("rejects an unknown commitment_scheme combo (v3 version + v2 commitment_scheme tag)", () => {
    const att = generateAttestation(makeParams({ commitment_scheme: "v3" }));
    (att.evidence as { commitment_scheme: string }).commitment_scheme =
      "v2-pedersen-ristretto255";
    const result = verifyAttestation(att, pubKeyHex, true);
    // commitment_scheme is in signed evidence → signature check catches it.
    expect(result.valid).toBe(false);
  });

  it("v3 range proof is bound to the attestation identity (proof swap rejected)", () => {
    const attA = generateAttestation(
      makeParams({
        commitment_scheme: "v3",
        actual_value: 50,
        threshold_value: 15,
        threshold_type: "ABOVE",
      }),
    );
    const attB = generateAttestation(
      makeParams({
        commitment_scheme: "v3",
        actual_value: 60,
        threshold_value: 15,
        threshold_type: "ABOVE",
      }),
    );
    // Move A's range proof onto B. Ed25519 catches it.
    attB.evidence.range_proof = attA.evidence.range_proof;
    const result = verifyAttestation(attB, pubKeyHex, true);
    expect(result.valid).toBe(false);
  });

  it("BELOW threshold roundtrip works for v3", () => {
    const att = generateAttestation(
      makeParams({
        commitment_scheme: "v3",
        actual_value: 5,
        threshold_value: 25,
        threshold_type: "BELOW",
      }),
    );
    expect(att.claim.result).toBe(true);
    expect(att.evidence.range_proof?.threshold_type).toBe("BELOW");
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(true);
    expect(result.checks.range_proof_valid).toBe(true);
  });

  it("boundary v == T verifies for v3 ABOVE", () => {
    const att = generateAttestation(
      makeParams({
        commitment_scheme: "v3",
        actual_value: 15,
        threshold_value: 15,
        threshold_type: "ABOVE",
      }),
    );
    const result = verifyAttestation(att, pubKeyHex, true);
    expect(result.valid).toBe(true);
  });
});
