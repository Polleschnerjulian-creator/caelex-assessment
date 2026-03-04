/**
 * Tests for attestation verification.
 *
 * Uses verity-core's buildAttestation + generateKeyPair to create real
 * attestations, then verifies them through the SDK.
 */

import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  buildAttestation,
  utcNow,
  utcFuture,
} from "@caelex/verity-core";
import type { Attestation } from "@caelex/verity-core";
import { verifyAttestation } from "../src/verify-attestation.js";
import type { TrustedKeySet } from "../src/types.js";

/** Helper to build a standard test attestation with keys */
function buildTestAttestation() {
  const operator = generateKeyPair();
  const attester = generateKeyPair();

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

  const trustedKeys: TrustedKeySet = {
    operatorKeys: [{ keyId: "key-001", publicKey: operator.publicKey }],
    attesterKeys: [{ keyId: "attester-001", publicKey: attester.publicKey }],
  };

  return { attestation, operator, attester, trustedKeys };
}

describe("verifyAttestation", () => {
  it("should verify a valid v2 attestation with all checks passing", () => {
    const { attestation, trustedKeys } = buildTestAttestation();

    const result = verifyAttestation(attestation, trustedKeys);

    expect(result.valid).toBe(true);
    expect(result.protocolVersion).toBe(2);
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.subject.assetType).toBe("satellite");
    expect(result.subject.assetId).toBe("SAT-001");
    expect(result.statement.measurementType).toBe("fuel_margin");
    expect(result.statement.predicateType).toBe("THRESHOLD");
    expect(result.statement.operator).toBe("ABOVE");
  });

  it("should verify attestation passed as JSON string", () => {
    const { attestation, trustedKeys } = buildTestAttestation();
    const json = JSON.stringify(attestation);

    const result = verifyAttestation(json, trustedKeys);

    expect(result.valid).toBe(true);
    expect(result.protocolVersion).toBe(2);
  });

  it("should fail when operator signature is invalid (tampered attestation_id)", () => {
    const { attestation, trustedKeys } = buildTestAttestation();

    // Tamper with the attestation_id after signing
    const tampered: Attestation = {
      ...attestation,
      attestation_id: "tampered-id-12345",
    };

    const result = verifyAttestation(tampered, trustedKeys);

    expect(result.valid).toBe(false);
    const sigCheck = result.checks.find(
      (c) => c.check === "operator_signature",
    );
    expect(sigCheck).toBeDefined();
    expect(sigCheck!.passed).toBe(false);
  });

  it("should fail when attestation has expired", () => {
    const operator = generateKeyPair();
    const attester = generateKeyPair();

    // Create attestation that expired in the past
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const pastStr = past.toISOString();

    const morePast = new Date();
    morePast.setDate(morePast.getDate() - 20);
    const morePastStr = morePast.toISOString();

    const attestation = buildAttestation({
      tenantId: "tenant-test",
      subject: { asset_type: "satellite", asset_id: "SAT-002" },
      statement: {
        predicate_type: "THRESHOLD",
        operator: "ABOVE",
        measurement_type: "fuel_margin",
        threshold_ref: "policy/eusa-2034.3/art54",
        valid_from: morePastStr,
        valid_until: pastStr,
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

    const trustedKeys: TrustedKeySet = {
      operatorKeys: [{ keyId: "key-001", publicKey: operator.publicKey }],
      attesterKeys: [{ keyId: "attester-001", publicKey: attester.publicKey }],
    };

    const result = verifyAttestation(attestation, trustedKeys);

    expect(result.valid).toBe(false);
    const temporalCheck = result.checks.find(
      (c) => c.check === "temporal_validity",
    );
    expect(temporalCheck).toBeDefined();
    expect(temporalCheck!.passed).toBe(false);
    expect(temporalCheck!.detail).toContain("expired");
  });

  it("should fail when operator key is not in trusted key set", () => {
    const { attestation } = buildTestAttestation();

    // Empty trusted keys
    const emptyKeys: TrustedKeySet = {
      operatorKeys: [],
      attesterKeys: [],
    };

    const result = verifyAttestation(attestation, emptyKeys);

    expect(result.valid).toBe(false);
    const keyCheck = result.checks.find(
      (c) => c.check === "operator_key_found",
    );
    expect(keyCheck).toBeDefined();
    expect(keyCheck!.passed).toBe(false);
    expect(keyCheck!.detail).toContain("not found");
  });

  it("should fail when tenant_id is tampered (breaks operator signature)", () => {
    const { attestation, trustedKeys } = buildTestAttestation();

    const tampered: Attestation = {
      ...attestation,
      tenant_id: "wrong-tenant",
    };

    const result = verifyAttestation(tampered, trustedKeys);

    expect(result.valid).toBe(false);
    const sigCheck = result.checks.find(
      (c) => c.check === "operator_signature",
    );
    expect(sigCheck).toBeDefined();
    expect(sigCheck!.passed).toBe(false);
  });

  it("should fail when threshold_ref is tampered (breaks operator signature)", () => {
    const { attestation, trustedKeys } = buildTestAttestation();

    const tampered: Attestation = {
      ...attestation,
      statement: {
        ...attestation.statement,
        threshold_ref: "policy/tampered/ref",
      },
    };

    const result = verifyAttestation(tampered, trustedKeys);

    expect(result.valid).toBe(false);
    const sigCheck = result.checks.find(
      (c) => c.check === "operator_signature",
    );
    expect(sigCheck).toBeDefined();
    expect(sigCheck!.passed).toBe(false);
  });

  it("should handle invalid JSON string gracefully", () => {
    const trustedKeys: TrustedKeySet = {
      operatorKeys: [],
      attesterKeys: [],
    };

    const result = verifyAttestation("not valid json {{{", trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.checks[0]!.check).toBe("parse");
    expect(result.checks[0]!.passed).toBe(false);
  });

  it("should handle null attestation gracefully", () => {
    const trustedKeys: TrustedKeySet = {
      operatorKeys: [],
      attesterKeys: [],
    };

    const result = verifyAttestation(null, trustedKeys);

    expect(result.valid).toBe(false);
    expect(result.checks[0]!.check).toBe("parse");
  });

  it("should warn about unknown protocol version", () => {
    const { attestation, trustedKeys } = buildTestAttestation();

    // Force a different protocol version (this will also break signature)
    const tampered = {
      ...attestation,
      protocol_version: 3,
    } as unknown as Attestation;

    const result = verifyAttestation(tampered, trustedKeys);

    // Should have a warning about unexpected version
    expect(result.warnings.some((w) => w.includes("protocol version"))).toBe(
      true,
    );
  });

  it("should verify attestation with only operator key (no attester key)", () => {
    const { attestation, operator } = buildTestAttestation();

    const partialKeys: TrustedKeySet = {
      operatorKeys: [{ keyId: "key-001", publicKey: operator.publicKey }],
      attesterKeys: [], // no attester keys
    };

    const result = verifyAttestation(attestation, partialKeys);

    // Should fail because attester key not found
    expect(result.valid).toBe(false);
    const attesterKeyCheck = result.checks.find(
      (c) => c.check === "attester_key_found",
    );
    expect(attesterKeyCheck).toBeDefined();
    expect(attesterKeyCheck!.passed).toBe(false);
  });
});
