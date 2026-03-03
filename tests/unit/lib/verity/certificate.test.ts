import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { generateAttestation } from "@/lib/verity/core/attestation";
import { issueCertificate } from "@/lib/verity/certificates/generator";
import { verifyCertificate } from "@/lib/verity/certificates/verifier";
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

function makeAttestation(
  regulationRef: string,
  dataPoint: string,
  actual: number,
  thresholdValue: number,
  thresholdType: "ABOVE" | "BELOW" = "ABOVE",
): ThresholdAttestation {
  const params: GenerateAttestationParams = {
    regulation_ref: regulationRef,
    regulation_name: `Test Regulation ${regulationRef}`,
    threshold_type: thresholdType,
    threshold_value: thresholdValue,
    actual_value: actual,
    data_point: dataPoint,
    claim_statement: `Claim for ${regulationRef}`,
    subject: {
      operator_id: "op_123",
      satellite_norad_id: "58421",
      satellite_name: "TEST-SAT-1",
    },
    evidence_source: "sentinel",
    trust_score: 0.95,
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
  };
  return generateAttestation(params);
}

describe("issueCertificate", () => {
  it("issues a certificate with embedded attestations", () => {
    const att1 = makeAttestation("art_70", "remaining_fuel_pct", 57, 15);
    const att2 = makeAttestation(
      "art_68",
      "estimated_lifetime_yr",
      10,
      25,
      "BELOW",
    );

    const cert = issueCertificate({
      attestations: [att1, att2],
      operator_id: "op_123",
      operator_name: "Test Corp",
      satellite_norad_id: "58421",
      satellite_name: "TEST-SAT-1",
      issuer_key_id: "verity-2026-03-01",
      issuer_private_key_der: privKeyDer,
      issuer_public_key_hex: pubKeyHex,
      expires_in_days: 90,
      is_public: true,
    });

    expect(cert.certificate_id).toMatch(/^vc_/);
    expect(cert.claims).toHaveLength(2);
    expect(cert.embedded_attestations).toHaveLength(2);
    expect(cert.evidence_summary.total_attestations).toBe(2);
    expect(cert.signature).toBeTruthy();
  });

  it("throws on empty attestations", () => {
    expect(() =>
      issueCertificate({
        attestations: [],
        operator_id: "op_123",
        operator_name: "Test Corp",
        satellite_norad_id: null,
        satellite_name: null,
        issuer_key_id: "verity-2026-03-01",
        issuer_private_key_der: privKeyDer,
        issuer_public_key_hex: pubKeyHex,
        expires_in_days: 90,
        is_public: false,
      }),
    ).toThrow("at least one attestation");
  });
});

describe("verifyCertificate", () => {
  it("verifies a valid certificate with 4 claims OFFLINE", () => {
    const attestations = [
      makeAttestation("art_70", "remaining_fuel_pct", 57, 15),
      makeAttestation("art_68", "estimated_lifetime_yr", 10, 25, "BELOW"),
      makeAttestation("art_72", "remaining_fuel_pct", 30, 25),
      makeAttestation("nis2_patch", "patch_compliance_pct", 90, 80),
    ];

    const cert = issueCertificate({
      attestations,
      operator_id: "op_123",
      operator_name: "Test Corp",
      satellite_norad_id: "58421",
      satellite_name: "TEST-SAT-1",
      issuer_key_id: "verity-2026-03-01",
      issuer_private_key_der: privKeyDer,
      issuer_public_key_hex: pubKeyHex,
      expires_in_days: 90,
      is_public: true,
    });

    // Verify OFFLINE (no DB, no network)
    const result = verifyCertificate(cert, pubKeyHex);
    expect(result.valid).toBe(true);
    expect(result.checks.certificate_signature_valid).toBe(true);
    expect(result.checks.all_attestations_valid).toBe(true);
    expect(result.checks.claims_consistent).toBe(true);
    expect(result.checks.attestation_details).toHaveLength(4);
    result.checks.attestation_details.forEach((d) => {
      expect(d.valid).toBe(true);
    });
  });

  it("fails when one embedded attestation is tampered", () => {
    const attestations = [
      makeAttestation("art_70", "remaining_fuel_pct", 57, 15),
      makeAttestation("art_68", "estimated_lifetime_yr", 10, 25, "BELOW"),
    ];

    const cert = issueCertificate({
      attestations,
      operator_id: "op_123",
      operator_name: "Test Corp",
      satellite_norad_id: "58421",
      satellite_name: "TEST-SAT-1",
      issuer_key_id: "verity-2026-03-01",
      issuer_private_key_der: privKeyDer,
      issuer_public_key_hex: pubKeyHex,
      expires_in_days: 90,
      is_public: false,
    });

    // Tamper one embedded attestation
    cert.embedded_attestations[0].claim.result = false;

    const result = verifyCertificate(cert, pubKeyHex);
    expect(result.valid).toBe(false);
    // Certificate sig also breaks because embedded_attestations are signed
    expect(result.checks.certificate_signature_valid).toBe(false);
  });

  it("fails with wrong public key", () => {
    const att = makeAttestation("art_70", "remaining_fuel_pct", 57, 15);
    const cert = issueCertificate({
      attestations: [att],
      operator_id: "op_123",
      operator_name: "Test Corp",
      satellite_norad_id: null,
      satellite_name: null,
      issuer_key_id: "verity-2026-03-01",
      issuer_private_key_der: privKeyDer,
      issuer_public_key_hex: pubKeyHex,
      expires_in_days: 90,
      is_public: false,
    });

    const { publicKey: otherPub } = generateKeyPairSync("ed25519");
    const otherHex = otherPub
      .export({ type: "spki", format: "der" })
      .toString("hex");

    const result = verifyCertificate(cert, otherHex);
    expect(result.valid).toBe(false);
    expect(result.checks.issuer_key_matches).toBe(false);
  });

  it("stays valid when certificate-level verification_url changes", () => {
    const att = makeAttestation("art_70", "remaining_fuel_pct", 57, 15);
    const cert = issueCertificate({
      attestations: [att],
      operator_id: "op_123",
      operator_name: "Test Corp",
      satellite_norad_id: null,
      satellite_name: null,
      issuer_key_id: "verity-2026-03-01",
      issuer_private_key_der: privKeyDer,
      issuer_public_key_hex: pubKeyHex,
      expires_in_days: 90,
      is_public: false,
    });

    // Only change the certificate-level verification_url (which is unsigned)
    cert.verification_url = "https://new-domain.com/verify";
    // NOTE: Do NOT change embedded attestations — they are part of the
    // signed embedded_attestations field. Their own verification_url is
    // unsigned in the attestation, but the attestation itself is embedded
    // in the signed certificate payload.

    const result = verifyCertificate(cert, pubKeyHex);
    expect(result.valid).toBe(true);
  });
});
