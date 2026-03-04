/**
 * Unit tests for the Models module (Attestation & Certificate) — Verity 2036
 */

import { describe, it, expect } from "vitest";
import {
  buildAttestation,
  validateAttestation,
  buildCertificate,
  validateCertificate,
  computeMerkleRoot,
} from "../../src/models/index.js";
import { generateKeyPair, DOMAIN_TAGS } from "../../src/signatures/index.js";
import { canonicalizeToBytes } from "../../src/canonical/index.js";
import { utcNow, utcFuture } from "../../src/time/index.js";
import type {
  BuildAttestationParams,
  Attestation,
} from "../../src/models/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAttestationParams(
  overrides?: Partial<BuildAttestationParams>,
): BuildAttestationParams {
  const operatorKp = generateKeyPair();
  const attesterKp = generateKeyPair();

  return {
    tenantId: "tenant-001",
    subject: { asset_type: "satellite", asset_id: "sat-001" },
    statement: {
      predicate_type: "THRESHOLD",
      operator: "ABOVE",
      measurement_type: "fuel_margin",
      threshold_ref: "policy/fuel-margin/v3",
      valid_from: utcNow(),
      valid_until: utcFuture(30),
    },
    actualValue: 85.5,
    commitmentDomain: "test-commitment-domain",
    commitmentContext: { tenant: "tenant-001", asset: "sat-001" },
    evidenceRef: "evidence/bundle/001",
    evidenceHash: "a".repeat(64),
    attesterId: "attester-001",
    attesterPrivateKey: attesterKp.privateKey,
    attesterPublicKey: attesterKp.publicKey,
    operatorPrivateKey: operatorKp.privateKey,
    operatorKeyId: "key-001",
    ...overrides,
  };
}

function buildValidAttestation(
  overrides?: Partial<BuildAttestationParams>,
): Attestation {
  return buildAttestation(makeAttestationParams(overrides));
}

// ---------------------------------------------------------------------------
// buildAttestation
// ---------------------------------------------------------------------------

describe("buildAttestation", () => {
  it("creates valid attestation with all required fields", () => {
    const att = buildValidAttestation();
    expect(att.attestation_id).toBeTruthy();
    expect(att.protocol_version).toBe(2);
    expect(att.tenant_id).toBe("tenant-001");
    expect(att.subject.asset_type).toBe("satellite");
    expect(att.subject.asset_id).toBe("sat-001");
    expect(att.statement.predicate_type).toBe("THRESHOLD");
    expect(att.statement.operator).toBe("ABOVE");
    expect(att.statement.measurement_type).toBe("fuel_margin");
    expect(att.commitment.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(att.commitment.scheme).toBe("sha256-blinded-v2");
    expect(att.evidence.evidence_ref).toBe("evidence/bundle/001");
    expect(att.evidence.attester_signature).toMatch(/^[0-9a-f]{128}$/);
    expect(att.signatures.operator_signature).toMatch(/^[0-9a-f]{128}$/);
    expect(att.metadata.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(att.metadata.created_at).toBeTruthy();
  });

  it("never contains actualValue in output (deep search all values)", () => {
    const actualValue = 85.5;
    const att = buildValidAttestation({ actualValue });
    const json = JSON.stringify(att);
    expect(json).not.toContain(String(actualValue));
  });

  it("does not contain actualValue even as a number in any nested field", () => {
    const actualValue = 99.123;
    const att = buildValidAttestation({ actualValue });

    function findValue(obj: unknown): boolean {
      if (obj === actualValue) return true;
      if (typeof obj === "object" && obj !== null) {
        for (const v of Object.values(obj as Record<string, unknown>)) {
          if (findValue(v)) return true;
        }
      }
      return false;
    }
    expect(findValue(att)).toBe(false);
  });

  it("sets sequence_number to default 1 when not provided", () => {
    const att = buildValidAttestation();
    expect(att.statement.sequence_number).toBe(1);
  });

  it("uses provided sequence_number when given", () => {
    const params = makeAttestationParams();
    params.statement = { ...params.statement, sequence_number: 5 };
    const att = buildAttestation(params);
    expect(att.statement.sequence_number).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// validateAttestation
// ---------------------------------------------------------------------------

describe("validateAttestation", () => {
  it("returns valid for a well-formed attestation", () => {
    const att = buildValidAttestation();
    const result = validateAttestation(att);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("with operator public key verifies signature", () => {
    const operatorKp = generateKeyPair();
    const att = buildValidAttestation({
      operatorPrivateKey: operatorKp.privateKey,
    });
    const result = validateAttestation(att, operatorKp.publicKey);
    expect(result.valid).toBe(true);
  });

  it("with wrong public key fails signature", () => {
    const operatorKp = generateKeyPair();
    const wrongKp = generateKeyPair();
    const att = buildValidAttestation({
      operatorPrivateKey: operatorKp.privateKey,
    });
    const result = validateAttestation(att, wrongKp.publicKey);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.toLowerCase().includes("signature")),
    ).toBe(true);
  });

  it("returns errors for missing fields", () => {
    const att = buildValidAttestation();
    // Remove a required field
    const broken = { ...att, tenant_id: "" } as Attestation;
    const result = validateAttestation(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns error for invalid protocol version", () => {
    const att = buildValidAttestation();
    const broken = { ...att, protocol_version: 1 } as unknown as Attestation;
    const result = validateAttestation(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("protocol_version"))).toBe(
      true,
    );
  });

  it("warns for expired attestation", () => {
    const att = buildValidAttestation();
    // Set valid_until to far past
    const expired = {
      ...att,
      statement: {
        ...att.statement,
        valid_until: new Date("2020-01-01T00:00:00.000Z").toISOString(),
      },
    };
    const result = validateAttestation(expired);
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("expired")),
    ).toBe(true);
  });

  it("validates attester evidence signature when attester public key is provided", () => {
    const operatorKp = generateKeyPair();
    const attesterKp = generateKeyPair();
    const att = buildValidAttestation({
      operatorPrivateKey: operatorKp.privateKey,
      attesterPrivateKey: attesterKp.privateKey,
      attesterPublicKey: attesterKp.publicKey,
    });
    const result = validateAttestation(
      att,
      operatorKp.publicKey,
      attesterKp.publicKey,
    );
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildCertificate
// ---------------------------------------------------------------------------

describe("buildCertificate", () => {
  it("creates valid certificate", () => {
    const issuerKp = generateKeyPair();
    const att = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });

    expect(cert.cert_id).toBeTruthy();
    expect(cert.protocol_version).toBe(2);
    expect(cert.tenant_id).toBe("tenant-001");
    expect(cert.merkle_root).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.certificate_signature).toMatch(/^[0-9a-f]{128}$/);
    expect(cert.attestations.length).toBe(1);
  });

  it("computes correct Merkle root", () => {
    const issuerKp = generateKeyPair();
    const att1 = buildValidAttestation();
    const att2 = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att1, att2],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });

    // Recompute Merkle root from attestations
    const leaves = [att1, att2].map((a) => canonicalizeToBytes(a));
    const expectedRoot = computeMerkleRoot(leaves);
    expect(cert.merkle_root).toBe(expectedRoot);
  });

  it("throws for empty attestations array", () => {
    const issuerKp = generateKeyPair();
    expect(() =>
      buildCertificate({
        tenantId: "tenant-001",
        attestations: [],
        issuerPrivateKey: issuerKp.privateKey,
        issuerKeyId: "issuer-key-001",
        expiresInDays: 90,
        sequenceNumber: 1,
      }),
    ).toThrow("at least one");
  });

  it("includes issued_at timestamp", () => {
    const issuerKp = generateKeyPair();
    const att = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });
    expect(cert.issued_at).toBeTruthy();
    expect(new Date(cert.issued_at).getTime()).not.toBeNaN();
  });

  it("sets sequence number", () => {
    const issuerKp = generateKeyPair();
    const att = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 42,
    });
    expect(cert.sequence_number).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// validateCertificate
// ---------------------------------------------------------------------------

describe("validateCertificate", () => {
  it("returns valid for well-formed certificate", () => {
    const issuerKp = generateKeyPair();
    const att = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });
    const result = validateCertificate(cert);
    expect(result.valid).toBe(true);
  });

  it("with issuer public key verifies signature", () => {
    const issuerKp = generateKeyPair();
    const att = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });
    const result = validateCertificate(cert, issuerKp.publicKey);
    expect(result.valid).toBe(true);
  });

  it("fails if attestation is tampered", () => {
    const issuerKp = generateKeyPair();
    const att = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });

    // Tamper the attestation in the certificate
    const tampered = { ...cert };
    tampered.attestations = [{ ...att, attestation_id: "tampered-id" }];
    const result = validateCertificate(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("merkle"))).toBe(
      true,
    );
  });

  it("fails if attestation belongs to different tenant", () => {
    const issuerKp = generateKeyPair();
    const att = buildValidAttestation({ tenantId: "tenant-other" });
    const cert = buildCertificate({
      tenantId: "tenant-other",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });

    // Override the certificate tenant_id without updating the signature
    // We need to carefully construct a scenario where the cert's tenant != attestation's tenant
    const tamperedCert = {
      ...cert,
      tenant_id: "tenant-001",
    };

    // Note: this will fail because Merkle root was signed with original data
    // and tenant mismatch is also checked
    const result = validateCertificate(tamperedCert);
    expect(result.valid).toBe(false);
  });

  it("fails with wrong issuer public key", () => {
    const issuerKp = generateKeyPair();
    const wrongKp = generateKeyPair();
    const att = buildValidAttestation();
    const cert = buildCertificate({
      tenantId: "tenant-001",
      attestations: [att],
      issuerPrivateKey: issuerKp.privateKey,
      issuerKeyId: "issuer-key-001",
      expiresInDays: 90,
      sequenceNumber: 1,
    });
    const result = validateCertificate(cert, wrongKp.publicKey);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.toLowerCase().includes("signature")),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeMerkleRoot
// ---------------------------------------------------------------------------

describe("computeMerkleRoot", () => {
  it("is deterministic for same inputs", () => {
    const leaves = [
      new TextEncoder().encode("leaf1"),
      new TextEncoder().encode("leaf2"),
    ];
    const root1 = computeMerkleRoot(leaves);
    const root2 = computeMerkleRoot(leaves);
    expect(root1).toBe(root2);
  });

  it("changes if any leaf changes", () => {
    const leaves1 = [
      new TextEncoder().encode("leaf1"),
      new TextEncoder().encode("leaf2"),
    ];
    const leaves2 = [
      new TextEncoder().encode("leaf1"),
      new TextEncoder().encode("leaf3"),
    ];
    const root1 = computeMerkleRoot(leaves1);
    const root2 = computeMerkleRoot(leaves2);
    expect(root1).not.toBe(root2);
  });

  it("returns 64-char hex string", () => {
    const leaves = [new TextEncoder().encode("data")];
    const root = computeMerkleRoot(leaves);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws for empty leaves", () => {
    expect(() => computeMerkleRoot([])).toThrow("empty");
  });

  it("different order produces different root", () => {
    const leaves1 = [
      new TextEncoder().encode("a"),
      new TextEncoder().encode("b"),
    ];
    const leaves2 = [
      new TextEncoder().encode("b"),
      new TextEncoder().encode("a"),
    ];
    const root1 = computeMerkleRoot(leaves1);
    const root2 = computeMerkleRoot(leaves2);
    expect(root1).not.toBe(root2);
  });
});
