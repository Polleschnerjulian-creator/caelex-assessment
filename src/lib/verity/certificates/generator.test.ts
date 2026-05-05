/**
 * T2-6 (audit fix 2026-05-05): full certificate generate→verify
 * roundtrip. Bundles 1..N attestations into a Verity certificate,
 * Ed25519-signs the cert, and verifies it offline.
 *
 * Pure crypto — no DB. Mirrors the T2-5 attestation roundtrip
 * pattern. Uses real attestations (via generateAttestation) so the
 * embedded-attestation verification path runs end-to-end.
 *
 * Coverage:
 *   - happy path: 1, 3, 10 attestation bundles
 *   - claims↔attestations consistency (length, ids match)
 *   - evidence_summary aggregation (sentinel_backed, cross_verified,
 *     min_trust_level)
 *   - empty attestation list rejected at issue time
 *   - reject: tampered cert signature
 *   - reject: tampered claim_statement on an embedded attestation
 *   - reject: wrong issuer public key
 *   - reject: expired cert (expires_in_days = -1)
 *   - reject: claims pointing to attestation_ids not in
 *     embedded_attestations (forge a stale claim entry)
 *   - reject: dropped attestation (length mismatch claims vs
 *     embedded_attestations)
 *   - reject: replaced attestation with one signed by a different key
 */

import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { issueCertificate } from "./generator";
import { verifyCertificate } from "./verifier";
import { generateAttestation } from "../core/attestation";
import type { ThresholdAttestation } from "../core/types";

interface IssuerKey {
  keyId: string;
  publicKeyHex: string;
  privateKeyDer: Buffer;
}

function makeKey(keyId = "verity-cert-test-2026-05-05"): IssuerKey {
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

function makeAttestation(
  key: IssuerKey,
  i: number,
  withSentinel = true,
  withCrossVerify = true,
): ThresholdAttestation {
  return generateAttestation({
    regulation_ref: `eu_space_act_art_${70 + i}`,
    regulation_name: `Test reg ${i}`,
    threshold_type: "ABOVE",
    threshold_value: 10,
    actual_value: 95,
    data_point: "remaining_fuel_pct",
    claim_statement: `Above threshold for reg ${i}`,
    subject: {
      operator_id: "user_test",
      satellite_norad_id: "12345",
      satellite_name: "TestSat",
    },
    evidence_source: "sentinel",
    trust_score: 0.98,
    collected_at: new Date(Date.now() - i * 1000).toISOString(),
    sentinel_anchor: withSentinel
      ? {
          sentinel_id: "sentinel_1",
          chain_position: i,
          chain_hash: "deadbeef",
          collected_at: new Date(Date.now() - i * 1000).toISOString(),
        }
      : null,
    cross_verification: withCrossVerify
      ? {
          public_source: "ESA",
          verification_result: "MATCH",
          verified_at: new Date().toISOString(),
        }
      : null,
    issuer_key_id: key.keyId,
    issuer_private_key_der: key.privateKeyDer,
    issuer_public_key_hex: key.publicKeyHex,
    expires_in_days: 90,
    commitment_scheme: "v1",
  });
}

function makeCert(
  key: IssuerKey,
  attestations: ThresholdAttestation[],
  overrides: Partial<{ expires_in_days: number; is_public: boolean }> = {},
) {
  return issueCertificate({
    attestations,
    operator_id: "user_test",
    operator_name: "Test Operator GmbH",
    satellite_norad_id: "12345",
    satellite_name: "TestSat",
    issuer_key_id: key.keyId,
    issuer_private_key_der: key.privateKeyDer,
    issuer_public_key_hex: key.publicKeyHex,
    expires_in_days: overrides.expires_in_days ?? 90,
    is_public: overrides.is_public ?? false,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("certificate roundtrip — happy path", () => {
  let key: IssuerKey;
  beforeAll(() => {
    key = makeKey();
  });

  for (const n of [1, 3, 10] as const) {
    it(`bundles ${n} attestation${n === 1 ? "" : "s"} and verifies`, () => {
      const attestations = Array.from({ length: n }, (_, i) =>
        makeAttestation(key, i),
      );
      const cert = makeCert(key, attestations);

      expect(cert.claims).toHaveLength(n);
      expect(cert.embedded_attestations).toHaveLength(n);
      expect(cert.evidence_summary.total_attestations).toBe(n);
      expect(cert.evidence_summary.sentinel_backed).toBe(n);
      expect(cert.evidence_summary.cross_verified).toBe(n);
      expect(cert.evidence_summary.min_trust_level).toBe("HIGH");

      const result = verifyCertificate(cert, key.publicKeyHex);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.checks.all_attestations_valid).toBe(true);
      expect(result.checks.claims_consistent).toBe(true);
    });
  }

  it("computes min_trust_level as the lowest across attestations", () => {
    // Mix HIGH (sentinel + cross), MEDIUM (sentinel only), and a LOW
    // requires trust_score < 0.7 — set evidence_source: "manual" with
    // trust_score 0.6 to drop into LOW band.
    const high = makeAttestation(key, 0, true, true);
    const medium = makeAttestation(key, 1, true, false);
    const low = generateAttestation({
      regulation_ref: "eu_space_act_art_72",
      regulation_name: "Manual decl",
      threshold_type: "ABOVE",
      threshold_value: 1,
      actual_value: 1,
      data_point: "manual_declaration",
      claim_statement: "Self-declared compliant",
      subject: {
        operator_id: "user_test",
        satellite_norad_id: "12345",
        satellite_name: "TestSat",
      },
      evidence_source: "manual",
      trust_score: 0.6,
      collected_at: new Date().toISOString(),
      sentinel_anchor: null,
      cross_verification: null,
      issuer_key_id: key.keyId,
      issuer_private_key_der: key.privateKeyDer,
      issuer_public_key_hex: key.publicKeyHex,
      expires_in_days: 90,
      commitment_scheme: "v1",
    });
    const cert = makeCert(key, [high, medium, low]);
    expect(cert.evidence_summary.min_trust_level).toBe("LOW");
    expect(cert.evidence_summary.sentinel_backed).toBe(2);
    expect(cert.evidence_summary.cross_verified).toBe(1);

    const result = verifyCertificate(cert, key.publicKeyHex);
    expect(result.valid).toBe(true);
  });

  it("each claim's attestation_id matches an embedded attestation", () => {
    const attestations = [
      makeAttestation(key, 0),
      makeAttestation(key, 1),
      makeAttestation(key, 2),
    ];
    const cert = makeCert(key, attestations);
    for (const claim of cert.claims) {
      expect(
        cert.embedded_attestations.find(
          (a) => a.attestation_id === claim.attestation_id,
        ),
      ).toBeDefined();
    }
  });
});

describe("certificate issuance rejection", () => {
  let key: IssuerKey;
  beforeAll(() => {
    key = makeKey();
  });

  it("throws on empty attestation list", () => {
    expect(() => makeCert(key, [])).toThrow(/at least one attestation/i);
  });
});

describe("certificate verification rejection", () => {
  let key: IssuerKey;
  beforeAll(() => {
    key = makeKey();
  });

  it("rejects tampered certificate signature", () => {
    const cert = makeCert(key, [makeAttestation(key, 0)]);
    const tampered = {
      ...cert,
      signature:
        (cert.signature[0] === "0" ? "1" : "0") + cert.signature.slice(1),
    };
    const result = verifyCertificate(tampered, key.publicKeyHex);
    expect(result.valid).toBe(false);
    expect(result.checks.certificate_signature_valid).toBe(false);
  });

  it("rejects tampered claim_statement on an embedded attestation", () => {
    const cert = makeCert(key, [makeAttestation(key, 0)]);
    const att0 = cert.embedded_attestations[0]!;
    const tampered = {
      ...cert,
      embedded_attestations: [
        {
          ...att0,
          claim: { ...att0.claim, claim_statement: "TAMPERED" },
        },
      ],
    };
    const result = verifyCertificate(tampered, key.publicKeyHex);
    expect(result.valid).toBe(false);
    // The cert sig still verifies (only embedded_attestations[0].claim
    // changed and that's signed BY THE ATTESTATION not the cert).
    // The embedded attestation re-verification catches it.
    expect(result.checks.all_attestations_valid).toBe(false);
  });

  it("rejects wrong issuer public key", () => {
    const cert = makeCert(key, [makeAttestation(key, 0)]);
    const otherKey = makeKey("verity-other");
    const result = verifyCertificate(cert, otherKey.publicKeyHex);
    expect(result.valid).toBe(false);
    expect(result.checks.issuer_key_matches).toBe(false);
  });

  it("rejects expired certificate", () => {
    const cert = makeCert(key, [makeAttestation(key, 0)], {
      expires_in_days: -1,
    });
    const result = verifyCertificate(cert, key.publicKeyHex);
    expect(result.valid).toBe(false);
    expect(result.checks.not_expired).toBe(false);
  });

  it("rejects claim referencing a non-embedded attestation_id", () => {
    const cert = makeCert(key, [
      makeAttestation(key, 0),
      makeAttestation(key, 1),
    ]);
    // Replace one claim's attestation_id with a phantom — claims
    // length unchanged, but consistency check fails.
    const tampered = {
      ...cert,
      claims: [
        { ...cert.claims[0]!, attestation_id: "va_phantom_does_not_exist" },
        cert.claims[1]!,
      ],
    };
    const result = verifyCertificate(tampered, key.publicKeyHex);
    expect(result.valid).toBe(false);
    expect(result.checks.claims_consistent).toBe(false);
  });

  it("rejects when claims and embedded_attestations lengths diverge", () => {
    const cert = makeCert(key, [
      makeAttestation(key, 0),
      makeAttestation(key, 1),
    ]);
    // Drop one embedded attestation but keep both claims.
    const tampered = {
      ...cert,
      embedded_attestations: [cert.embedded_attestations[0]!],
    };
    const result = verifyCertificate(tampered, key.publicKeyHex);
    expect(result.valid).toBe(false);
    expect(result.checks.structure_valid).toBe(false);
  });

  it("rejects when an embedded attestation was signed by a different key", () => {
    // The cert's issuer key_id and the attestation's issuer key_id
    // are both `key.keyId`, but the attestation was actually signed
    // by `otherKey`. The cert sig still verifies (we use `key`), but
    // the embedded attestation's signature won't.
    const otherKey = makeKey("verity-other");
    const att = generateAttestation({
      regulation_ref: "eu_space_act_art_70",
      regulation_name: "Sneaky",
      threshold_type: "ABOVE",
      threshold_value: 10,
      actual_value: 95,
      data_point: "remaining_fuel_pct",
      claim_statement: "Above",
      subject: {
        operator_id: "user_test",
        satellite_norad_id: "12345",
        satellite_name: "TestSat",
      },
      evidence_source: "sentinel",
      trust_score: 0.98,
      collected_at: new Date().toISOString(),
      sentinel_anchor: null,
      cross_verification: null,
      // Signed by the SECRET other key but advertised as `key.keyId`
      issuer_key_id: key.keyId,
      issuer_private_key_der: otherKey.privateKeyDer,
      issuer_public_key_hex: otherKey.publicKeyHex,
      expires_in_days: 90,
      commitment_scheme: "v1",
    });
    const cert = makeCert(key, [att]);
    const result = verifyCertificate(cert, key.publicKeyHex);
    expect(result.valid).toBe(false);
    expect(result.checks.all_attestations_valid).toBe(false);
  });
});
