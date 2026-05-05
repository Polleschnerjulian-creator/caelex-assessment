/**
 * T2-5 (audit fix 2026-05-05): full attestation generate→verify
 * roundtrip across all three commitment schemes (v1 SHA-256, v2
 * Pedersen + Schnorr PoK, v3 Pedersen + range proof).
 *
 * Pure crypto — no Prisma, no DB. The Ed25519 keypair is generated
 * fresh per test using node:crypto. This is a tier-2 deferral that
 * the audit plan parked because it needs a synthesised issuer key
 * fixture; that turned out to be ~5 lines (`generateKeyPairSync`).
 *
 * Coverage:
 *   - happy-path roundtrip per scheme × per threshold type
 *   - reject: tampered Ed25519 signature
 *   - reject: wrong issuer public key
 *   - reject: expired (expires_in_days = -1 ⇒ already expired)
 *   - reject: tampered claim_statement
 *   - reject: tampered evidence value_commitment
 *   - reject: v2 PoK tampered (mutated A)
 *   - reject: v3 range proof tampered (swapped threshold_type)
 *   - reject: cross-scheme version downgrade (v3 evidence with v1 version)
 *   - reject: issuer_known=false (passes only when DB acknowledges key)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { generateAttestation, verifyAttestation } from "./attestation";
import type { GenerateAttestationParams } from "./types";

// ─── Issuer keypair fixture ──────────────────────────────────────────

interface IssuerKeyFixture {
  keyId: string;
  publicKeyHex: string;
  privateKeyDer: Buffer;
}

function makeIssuerKeyFixture(
  keyId = "verity-test-2026-05-05",
): IssuerKeyFixture {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    keyId,
    publicKeyHex: publicKey
      .export({ type: "spki", format: "der" })
      .toString("hex"),
    privateKeyDer: privateKey.export({
      type: "pkcs8",
      format: "der",
    }) as Buffer,
  };
}

// ─── Params builder ──────────────────────────────────────────────────

function makeParams(
  scheme: "v1" | "v2" | "v3" | undefined,
  threshold_type: "ABOVE" | "BELOW",
  actual_value: number,
  threshold_value: number,
  key: IssuerKeyFixture,
  overrides: Partial<GenerateAttestationParams> = {},
): GenerateAttestationParams {
  return {
    regulation_ref: "eu_space_act_art_70",
    regulation_name: "Debris mitigation — passivation",
    threshold_type,
    threshold_value,
    actual_value,
    data_point: "remaining_fuel_pct",
    claim_statement: `Fuel reserve ${threshold_type === "ABOVE" ? "≥" : "≤"} ${threshold_value}%`,
    subject: {
      operator_id: "user_test_op",
      satellite_norad_id: "12345",
      satellite_name: "TestSat-1",
    },
    evidence_source: "sentinel",
    trust_score: 0.98,
    collected_at: "2026-05-01T12:00:00.000Z",
    sentinel_anchor: {
      sentinel_id: "sentinel_1",
      chain_position: 7,
      chain_hash: "deadbeef",
      collected_at: "2026-05-01T12:00:00.000Z",
    },
    cross_verification: null,
    issuer_key_id: key.keyId,
    issuer_private_key_der: key.privateKeyDer,
    issuer_public_key_hex: key.publicKeyHex,
    expires_in_days: 90,
    commitment_scheme: scheme,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("attestation roundtrip — happy path × scheme × threshold", () => {
  let key: IssuerKeyFixture;
  beforeAll(() => {
    key = makeIssuerKeyFixture();
  });

  for (const scheme of ["v1", "v2", "v3"] as const) {
    for (const tt of ["ABOVE", "BELOW"] as const) {
      it(`${scheme} ${tt}: generate→verify=valid (result=true)`, () => {
        // result=true means the value satisfies the claim.
        // ABOVE → actual >= threshold; BELOW → actual <= threshold.
        const actual = tt === "ABOVE" ? 95 : 5;
        const threshold = 10;
        const att = generateAttestation(
          makeParams(scheme, tt, actual, threshold, key),
        );
        expect(att.claim.result).toBe(true);
        expect(att.version).toBe(
          scheme === "v3" ? "3.0" : scheme === "v2" ? "2.0" : "1.0",
        );
        expect(att.signature).toMatch(/^[0-9a-f]+$/);

        const result = verifyAttestation(att, key.publicKeyHex, true);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.checks.signature_valid).toBe(true);
        expect(result.checks.commitment_proof_valid).toBe(true);
        expect(result.checks.range_proof_valid).toBe(true);
      });

      it(`${scheme} ${tt}: generate→verify=valid (result=false)`, () => {
        // result=false: claim NOT satisfied. The attestation is
        // still verifiable — it just records "this operator did NOT
        // meet the threshold".
        //
        // T2-CRYPTO-2 (audit fix 2026-05-05): v3 fall-back lets v3
        // issue FAIL attestations as v2 (Pedersen + Schnorr PoK).
        // The attestation's `evidence.scheme_fallback` field flags
        // the downgrade so the verifier knows trust dropped from
        // "trustless threshold check" to "trust Caelex's threshold
        // computation" — but the cryptographic verification still
        // succeeds end-to-end.
        const actual = tt === "ABOVE" ? 5 : 95;
        const threshold = 10;
        const att = generateAttestation(
          makeParams(scheme, tt, actual, threshold, key),
        );
        expect(att.claim.result).toBe(false);
        if (scheme === "v3") {
          // v3 falls back to v2 for FAIL.
          expect(att.version).toBe("2.0");
          expect(att.evidence.scheme_fallback).toBe("v3-pass-only");
          expect(att.evidence.commitment_proof).toBeDefined();
          expect(att.evidence.range_proof).toBeUndefined();
        } else {
          expect(att.evidence.scheme_fallback).toBeUndefined();
        }

        const result = verifyAttestation(att, key.publicKeyHex, true);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    }
  }

  it("default scheme (commitment_scheme=undefined) is v1", () => {
    const att = generateAttestation(
      makeParams(undefined, "ABOVE", 95, 10, key),
    );
    expect(att.version).toBe("1.0");
    expect(att.evidence.value_commitment.startsWith("sha256:")).toBe(true);
    expect(att.evidence.commitment_proof).toBeUndefined();
    expect(att.evidence.range_proof).toBeUndefined();
  });
});

// ─── Tamper rejection ─────────────────────────────────────────────────

describe("attestation tamper rejection", () => {
  let key: IssuerKeyFixture;
  beforeAll(() => {
    key = makeIssuerKeyFixture();
  });

  it("rejects when issuer_known=false (key not in Caelex keyset)", () => {
    const att = generateAttestation(makeParams("v1", "ABOVE", 95, 10, key));
    const result = verifyAttestation(att, key.publicKeyHex, false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      // eslint-disable-next-line no-irregular-whitespace
      "Issuer key_id not found in Caelex keyset — possible self-issued attestation",
    );
  });

  it("rejects when public key doesn't match", () => {
    const att = generateAttestation(makeParams("v1", "ABOVE", 95, 10, key));
    const otherKey = makeIssuerKeyFixture("verity-other-key");
    const result = verifyAttestation(att, otherKey.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.issuer_key_matches).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("rejects expired attestation (expires_in_days = -1)", () => {
    // Negative expires_in_days produces an already-past expiresAt.
    const att = generateAttestation(
      makeParams("v1", "ABOVE", 95, 10, key, { expires_in_days: -1 }),
    );
    const result = verifyAttestation(att, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.not_expired).toBe(false);
    expect(result.errors).toContain("Attestation expired");
  });

  it("rejects when signature bytes are flipped", () => {
    const att = generateAttestation(makeParams("v1", "ABOVE", 95, 10, key));
    // Flip the first hex pair of the signature.
    const tampered = {
      ...att,
      signature:
        (att.signature[0] === "0" ? "1" : "0") + att.signature.slice(1),
    };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("rejects when claim_statement is tampered post-sign", () => {
    const att = generateAttestation(makeParams("v1", "ABOVE", 95, 10, key));
    const tampered = {
      ...att,
      claim: { ...att.claim, claim_statement: "tampered claim" },
    };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("rejects when value_commitment is tampered post-sign", () => {
    const att = generateAttestation(makeParams("v1", "ABOVE", 95, 10, key));
    const tampered = {
      ...att,
      evidence: {
        ...att.evidence,
        value_commitment: "sha256:" + "a".repeat(64),
      },
    };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.signature_valid).toBe(false);
  });

  it("v2: rejects when commitment_proof.A is mutated", () => {
    const att = generateAttestation(makeParams("v2", "ABOVE", 95, 10, key));
    expect(att.evidence.commitment_proof).toBeDefined();
    const tamperedA =
      att.evidence.commitment_proof!.A.slice(0, -2) +
      (att.evidence.commitment_proof!.A.endsWith("00") ? "01" : "00");
    const tampered = {
      ...att,
      evidence: {
        ...att.evidence,
        commitment_proof: {
          ...att.evidence.commitment_proof!,
          A: tamperedA,
        },
      },
    };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    // Either the signature check OR the PoK check fails — both are
    // acceptable outcomes (mutating A also tampers the signed body).
    expect(
      result.checks.signature_valid === false ||
        result.checks.commitment_proof_valid === false,
    ).toBe(true);
  });

  it("v3: rejects when range_proof.threshold_type is swapped", () => {
    // Generate an ABOVE attestation, then swap to BELOW in evidence
    // while leaving claim.threshold_type as ABOVE. The verifier
    // explicitly cross-checks that range_proof.threshold_type matches
    // claim.threshold_type before running the actual proof verifier.
    const att = generateAttestation(makeParams("v3", "ABOVE", 95, 10, key));
    expect(att.evidence.range_proof).toBeDefined();
    const tampered = {
      ...att,
      evidence: {
        ...att.evidence,
        range_proof: {
          ...att.evidence.range_proof!,
          threshold_type: "BELOW" as const,
        },
      },
    };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    // Tamper triggers BOTH signature_valid=false (range_proof is in
    // the signed body) AND range_proof_valid=false (cross-check
    // catches it before re-verification).
    expect(result.checks.range_proof_valid).toBe(false);
  });

  it("v1: rejects when version is downgraded to a v3 evidence shape", () => {
    // Build a v3 attestation, then change version to "1.0" without
    // re-signing. Structure check rejects because v1 must NOT carry
    // a range_proof.
    const att = generateAttestation(makeParams("v3", "ABOVE", 95, 10, key));
    const tampered = { ...att, version: "1.0" as const };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects unknown version string", () => {
    const att = generateAttestation(makeParams("v1", "ABOVE", 95, 10, key));
    const tampered = { ...att, version: "9.9" as unknown as "1.0" };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects when commitment prefix doesn't match version", () => {
    // v1 attestation with the commitment hex-prefixed as pedersen.
    const att = generateAttestation(makeParams("v1", "ABOVE", 95, 10, key));
    const tampered = {
      ...att,
      evidence: {
        ...att.evidence,
        value_commitment: "pedersen:" + "a".repeat(64),
      },
    };
    const result = verifyAttestation(tampered, key.publicKeyHex, true);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  // T2-CRYPTO-2 (audit fix 2026-05-05): v3 FAIL fallback. The
  // happy-path tests above already exercise the v3-FAIL → v2 path
  // for both ABOVE and BELOW. This block adds two extra assertions:
  // the fallback bumps `version` and `evidence.scheme_fallback`
  // visibly so verifiers + dashboards can highlight the trust
  // downgrade, and the verifier accepts the result without warnings.

  it("[T2-CRYPTO-2 fixed] v3 ABOVE FAIL produces v2 with scheme_fallback marker", () => {
    const att = generateAttestation(makeParams("v3", "ABOVE", 5, 10, key));
    expect(att.claim.result).toBe(false);
    expect(att.version).toBe("2.0");
    expect(att.evidence.scheme_fallback).toBe("v3-pass-only");
    expect(att.evidence.commitment_proof).toBeDefined();
    expect(att.evidence.range_proof).toBeUndefined();

    const result = verifyAttestation(att, key.publicKeyHex, true);
    expect(result.valid).toBe(true);
    expect(result.checks.commitment_proof_valid).toBe(true);
  });

  it("[T2-CRYPTO-2 fixed] v3 PASS still ships native v3 (no fallback marker)", () => {
    const att = generateAttestation(makeParams("v3", "ABOVE", 95, 10, key));
    expect(att.claim.result).toBe(true);
    expect(att.version).toBe("3.0");
    expect(att.evidence.scheme_fallback).toBeUndefined();
    expect(att.evidence.range_proof).toBeDefined();
  });
});
