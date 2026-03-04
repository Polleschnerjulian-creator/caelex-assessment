/**
 * Tests for certificate verification.
 *
 * Uses verity-core's buildCertificate + buildAttestation to create real
 * certificates, then verifies them through the SDK.
 */

import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  buildAttestation,
  buildCertificate,
  utcNow,
  utcFuture,
} from "@caelex/verity-core";
import type { Certificate, Attestation } from "@caelex/verity-core";
import { verifyCertificate } from "../src/verify-certificate.js";
import type { CertificateTrustedKeySet } from "../src/types.js";

/** Helper to build test attestations and a certificate */
function buildTestCertificate(
  attestationCount: number = 3,
  expiresInDays: number = 365,
) {
  const operator = generateKeyPair();
  const attester = generateKeyPair();
  const issuer = generateKeyPair();

  const attestations: Attestation[] = [];
  for (let i = 0; i < attestationCount; i++) {
    attestations.push(
      buildAttestation({
        tenantId: "tenant-test",
        subject: {
          asset_type: "satellite",
          asset_id: `SAT-${String(i + 1).padStart(3, "0")}`,
        },
        statement: {
          predicate_type: "THRESHOLD",
          operator: "ABOVE",
          measurement_type: "fuel_margin",
          threshold_ref: "policy/eusa-2034.3/art54",
          valid_from: utcNow(),
          valid_until: utcFuture(365),
        },
        actualValue: 85.5 + i,
        commitmentDomain: "compliance.fuel",
        commitmentContext: { regulation: "EUSA-2034" },
        evidenceRef: `sentinel://SAT-${String(i + 1).padStart(3, "0")}/fuel/2026-03`,
        evidenceHash: String.fromCharCode(97 + i).repeat(64),
        attesterId: "attester-001",
        attesterPrivateKey: attester.privateKey,
        attesterPublicKey: attester.publicKey,
        operatorPrivateKey: operator.privateKey,
        operatorKeyId: "key-001",
      }),
    );
  }

  const certificate = buildCertificate({
    tenantId: "tenant-test",
    attestations,
    issuerPrivateKey: issuer.privateKey,
    issuerKeyId: "issuer-001",
    expiresInDays,
    sequenceNumber: 1,
  });

  const trustedKeys: CertificateTrustedKeySet = {
    operatorKeys: [{ keyId: "key-001", publicKey: operator.publicKey }],
    attesterKeys: [{ keyId: "attester-001", publicKey: attester.publicKey }],
    issuerKeys: [{ keyId: "issuer-001", publicKey: issuer.publicKey }],
  };

  return { certificate, attestations, operator, attester, issuer, trustedKeys };
}

describe("verifyCertificate", () => {
  it("should verify a valid certificate with 3 attestations as VALID", () => {
    const { certificate, trustedKeys } = buildTestCertificate(3);

    const result = verifyCertificate(certificate, trustedKeys);

    expect(result.valid).toBe(true);
    expect(result.status).toBe("VALID");
    expect(result.checks.certificateSignature).toBe(true);
    expect(result.checks.merkleRoot).toBe(true);
    expect(result.checks.expiry).toBe(true);
    expect(result.checks.attestations).toHaveLength(3);
    expect(result.checks.attestations.every((a) => a.valid)).toBe(true);
    expect(result.validAttestationIndices).toEqual([0, 1, 2]);
  });

  it("should verify certificate passed as JSON string", () => {
    const { certificate, trustedKeys } = buildTestCertificate(2);
    const json = JSON.stringify(certificate);

    const result = verifyCertificate(json, trustedKeys);

    expect(result.valid).toBe(true);
    expect(result.status).toBe("VALID");
  });

  it("should return PARTIALLY_VALID when some attestations have expired", () => {
    const operator = generateKeyPair();
    const attester = generateKeyPair();
    const issuer = generateKeyPair();

    // Build one valid and one expired attestation
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const morePast = new Date();
    morePast.setDate(morePast.getDate() - 20);

    const validAtt = buildAttestation({
      tenantId: "tenant-test",
      subject: { asset_type: "satellite", asset_id: "SAT-001" },
      statement: {
        predicate_type: "THRESHOLD",
        operator: "ABOVE",
        measurement_type: "fuel_margin",
        threshold_ref: "policy/eusa-2034.3/art54",
        valid_from: utcNow(),
        valid_until: utcFuture(365),
      },
      actualValue: 85.5,
      commitmentDomain: "compliance.fuel",
      commitmentContext: { regulation: "EUSA-2034" },
      evidenceRef: "sentinel://SAT-001/fuel/2026-03",
      evidenceHash: "a".repeat(64),
      attesterId: "attester-001",
      attesterPrivateKey: attester.privateKey,
      attesterPublicKey: attester.publicKey,
      operatorPrivateKey: operator.privateKey,
      operatorKeyId: "key-001",
    });

    const expiredAtt = buildAttestation({
      tenantId: "tenant-test",
      subject: { asset_type: "satellite", asset_id: "SAT-002" },
      statement: {
        predicate_type: "THRESHOLD",
        operator: "ABOVE",
        measurement_type: "fuel_margin",
        threshold_ref: "policy/eusa-2034.3/art54",
        valid_from: morePast.toISOString(),
        valid_until: past.toISOString(),
      },
      actualValue: 90.0,
      commitmentDomain: "compliance.fuel",
      commitmentContext: { regulation: "EUSA-2034" },
      evidenceRef: "sentinel://SAT-002/fuel/2026-03",
      evidenceHash: "b".repeat(64),
      attesterId: "attester-001",
      attesterPrivateKey: attester.privateKey,
      attesterPublicKey: attester.publicKey,
      operatorPrivateKey: operator.privateKey,
      operatorKeyId: "key-001",
    });

    const certificate = buildCertificate({
      tenantId: "tenant-test",
      attestations: [validAtt, expiredAtt],
      issuerPrivateKey: issuer.privateKey,
      issuerKeyId: "issuer-001",
      expiresInDays: 365,
      sequenceNumber: 1,
    });

    const trustedKeys: CertificateTrustedKeySet = {
      operatorKeys: [{ keyId: "key-001", publicKey: operator.publicKey }],
      attesterKeys: [{ keyId: "attester-001", publicKey: attester.publicKey }],
      issuerKeys: [{ keyId: "issuer-001", publicKey: issuer.publicKey }],
    };

    const result = verifyCertificate(certificate, trustedKeys);

    expect(result.status).toBe("PARTIALLY_VALID");
    expect(result.valid).toBe(false);
    expect(result.validAttestationIndices).toContain(0);
    expect(result.validAttestationIndices).not.toContain(1);
  });

  it("should return INVALID when merkle_root is tampered", () => {
    const { certificate, trustedKeys } = buildTestCertificate(2);

    // Tamper with Merkle root
    const tampered: Certificate = {
      ...certificate,
      merkle_root: "f".repeat(64),
    };

    const result = verifyCertificate(tampered, trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("INVALID");
    expect(result.checks.merkleRoot).toBe(false);
  });

  it("should return INVALID when cert_id is tampered (breaks signature)", () => {
    const { certificate, trustedKeys } = buildTestCertificate(2);

    const tampered: Certificate = {
      ...certificate,
      cert_id: "tampered-cert-id",
    };

    const result = verifyCertificate(tampered, trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("INVALID");
  });

  it("should return EXPIRED when certificate has expired", () => {
    // Build certificate that expires very quickly
    const operator = generateKeyPair();
    const attester = generateKeyPair();
    const issuer = generateKeyPair();

    const attestation = buildAttestation({
      tenantId: "tenant-test",
      subject: { asset_type: "satellite", asset_id: "SAT-001" },
      statement: {
        predicate_type: "THRESHOLD",
        operator: "ABOVE",
        measurement_type: "fuel_margin",
        threshold_ref: "policy/eusa-2034.3/art54",
        valid_from: utcNow(),
        valid_until: utcFuture(365),
      },
      actualValue: 85.5,
      commitmentDomain: "compliance.fuel",
      commitmentContext: { regulation: "EUSA-2034" },
      evidenceRef: "sentinel://SAT-001/fuel/2026-03",
      evidenceHash: "a".repeat(64),
      attesterId: "attester-001",
      attesterPrivateKey: attester.privateKey,
      attesterPublicKey: attester.publicKey,
      operatorPrivateKey: operator.privateKey,
      operatorKeyId: "key-001",
    });

    // Build certificate with a past expiry by directly manipulating it
    const certificate = buildCertificate({
      tenantId: "tenant-test",
      attestations: [attestation],
      issuerPrivateKey: issuer.privateKey,
      issuerKeyId: "issuer-001",
      expiresInDays: -10, // Already expired
      sequenceNumber: 1,
    });

    const trustedKeys: CertificateTrustedKeySet = {
      operatorKeys: [{ keyId: "key-001", publicKey: operator.publicKey }],
      attesterKeys: [{ keyId: "attester-001", publicKey: attester.publicKey }],
      issuerKeys: [{ keyId: "issuer-001", publicKey: issuer.publicKey }],
    };

    const result = verifyCertificate(certificate, trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("EXPIRED");
    expect(result.checks.expiry).toBe(false);
  });

  it("should return INVALID when attestations are string IDs instead of objects", () => {
    const { trustedKeys } = buildTestCertificate(1);

    // Construct a certificate-like object with string attestation IDs
    const certWithStringAtts = {
      cert_id: "test-cert",
      protocol_version: 2,
      tenant_id: "tenant-test",
      issuer_key_id: "issuer-001",
      issued_at: utcNow(),
      expires_at: utcFuture(365),
      attestations: ["att-id-1", "att-id-2", "att-id-3"],
      merkle_root: "a".repeat(64),
      certificate_signature: "b".repeat(128),
      sequence_number: 1,
    };

    const result = verifyCertificate(certWithStringAtts, trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("INVALID");
    expect(result.warnings.some((w) => w.includes("full objects"))).toBe(true);
  });

  it("should return INVALID when issuer key is not in trusted key set", () => {
    const { certificate } = buildTestCertificate(2);

    const emptyKeys: CertificateTrustedKeySet = {
      operatorKeys: [],
      attesterKeys: [],
      issuerKeys: [], // No issuer keys
    };

    const result = verifyCertificate(certificate, emptyKeys);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("INVALID");
    expect(result.warnings.some((w) => w.includes("not found"))).toBe(true);
  });

  it("should handle invalid JSON string gracefully", () => {
    const trustedKeys: CertificateTrustedKeySet = {
      operatorKeys: [],
      attesterKeys: [],
      issuerKeys: [],
    };

    const result = verifyCertificate("not valid json {{{", trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("INVALID");
  });

  it("should handle null certificate gracefully", () => {
    const trustedKeys: CertificateTrustedKeySet = {
      operatorKeys: [],
      attesterKeys: [],
      issuerKeys: [],
    };

    const result = verifyCertificate(null, trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("INVALID");
  });
});
