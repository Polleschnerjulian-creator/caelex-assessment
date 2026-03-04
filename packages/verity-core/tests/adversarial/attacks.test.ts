/**
 * Adversarial Tests — Verity 2036
 *
 * Simulates specific attack scenarios to verify that the cryptographic
 * library correctly rejects malicious inputs and prevents exploitation.
 */

import { describe, it, expect } from "vitest";

import {
  generateKeyPair,
  sign,
  verify,
  buildAttestation,
  validateAttestation,
  buildCertificate,
  validateCertificate,
  createCommitment,
  verifyCommitment,
  canonicalize,
  hexToBytes,
  bytesToHex,
  utcFuture,
  isExpired,
  detectProtocolVersion,
  ThresholdCommitmentProofProvider,
  KeyManager,
  InMemoryKeyStore,
} from "../../src/index.js";

import type { Attestation, BuildAttestationParams } from "../../src/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid attestation with default parameters. */
function makeAttestationParams(overrides?: Partial<BuildAttestationParams>) {
  const attesterKeys = generateKeyPair();
  const operatorKeys = generateKeyPair();

  const defaults: BuildAttestationParams = {
    tenantId: "tenant-test",
    subject: { asset_type: "satellite", asset_id: "SAT-001" },
    statement: {
      predicate_type: "THRESHOLD",
      operator: "ABOVE",
      measurement_type: "fuel_margin_pct",
      threshold_ref: "policy-v1",
      valid_from: new Date().toISOString(),
      valid_until: utcFuture(90),
    },
    actualValue: 42.0,
    commitmentDomain: "VERITY2036_ATTESTATION_V2",
    commitmentContext: { regulation: "eu_space_act_art_70" },
    evidenceRef: "sentinel://packet/test",
    evidenceHash: "a".repeat(64),
    attesterId: "attester-001",
    attesterPrivateKey: attesterKeys.privateKey,
    attesterPublicKey: attesterKeys.publicKey,
    operatorPrivateKey: operatorKeys.privateKey,
    operatorKeyId: "op-key-001",
  };

  return {
    params: { ...defaults, ...overrides },
    attesterKeys,
    operatorKeys,
  };
}

// ---------------------------------------------------------------------------
// Attack 1: Replay Attack
// ---------------------------------------------------------------------------

describe("Attack 1: Replay Attack", () => {
  it("two attestations with identical parameters have different nonces and IDs", () => {
    const { params } = makeAttestationParams();

    const a1 = buildAttestation(params);
    const a2 = buildAttestation(params);

    // Different attestation IDs
    expect(a1.attestation_id).not.toBe(a2.attestation_id);

    // Different nonces (anti-replay)
    expect(a1.metadata.nonce).not.toBe(a2.metadata.nonce);

    // Different operator signatures (because nonce/id differ)
    expect(a1.signatures.operator_signature).not.toBe(
      a2.signatures.operator_signature,
    );
  });
});

// ---------------------------------------------------------------------------
// Attack 2: Tenant Swap
// ---------------------------------------------------------------------------

describe("Attack 2: Tenant Swap", () => {
  it("attestation signed for tenant-A does not verify with tenant-B keys", () => {
    const attesterKeys = generateKeyPair();
    const operatorA = generateKeyPair();
    const operatorB = generateKeyPair();

    const attestation = buildAttestation({
      tenantId: "tenant-A",
      subject: { asset_type: "satellite", asset_id: "SAT-001" },
      statement: {
        predicate_type: "THRESHOLD",
        operator: "ABOVE",
        measurement_type: "fuel_margin_pct",
        threshold_ref: "policy-v1",
        valid_from: new Date().toISOString(),
        valid_until: utcFuture(90),
      },
      actualValue: 42.0,
      commitmentDomain: "VERITY2036_ATTESTATION_V2",
      commitmentContext: { regulation: "eu_space_act" },
      evidenceRef: "sentinel://test",
      evidenceHash: "b".repeat(64),
      attesterId: "attester-001",
      attesterPrivateKey: attesterKeys.privateKey,
      attesterPublicKey: attesterKeys.publicKey,
      operatorPrivateKey: operatorA.privateKey,
      operatorKeyId: "op-A",
    });

    // Validate with tenant-B's operator key: should fail
    const result = validateAttestation(
      attestation,
      operatorB.publicKey,
      attesterKeys.publicKey,
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Operator signature verification failed");
  });
});

// ---------------------------------------------------------------------------
// Attack 3: Protocol Downgrade
// ---------------------------------------------------------------------------

describe("Attack 3: Protocol Downgrade", () => {
  it("changing protocol_version from 2 to 1 invalidates the attestation", () => {
    const { params, operatorKeys, attesterKeys } = makeAttestationParams();
    const attestation = buildAttestation(params);

    // Deep clone and tamper the version
    const tampered = JSON.parse(JSON.stringify(attestation)) as Attestation;
    (tampered as Record<string, unknown>).protocol_version = 1;

    // V2 validation: version mismatch error
    const v2Result = validateAttestation(tampered);
    expect(v2Result.valid).toBe(false);
    expect(v2Result.errors.some((e) => e.includes("protocol_version"))).toBe(
      true,
    );

    // V1 detection sees it as legacy
    const detected = detectProtocolVersion(tampered);
    expect(detected.version).toBe(1);
    expect(detected.isLegacy).toBe(true);

    // Even if we try to verify the original V2 signature, it fails because
    // the protocol_version field changed
    const sigResult = validateAttestation(
      tampered,
      operatorKeys.publicKey,
      attesterKeys.publicKey,
    );
    expect(sigResult.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Attack 4: Altered Policy Reference
// ---------------------------------------------------------------------------

describe("Attack 4: Altered Policy Reference", () => {
  it("changing threshold_ref invalidates the operator signature", () => {
    const { params, operatorKeys, attesterKeys } = makeAttestationParams();
    const attestation = buildAttestation(params);

    // Deep clone and tamper
    const tampered = JSON.parse(JSON.stringify(attestation)) as Attestation;
    tampered.statement.threshold_ref = "policy-v2";

    // Structural validation may pass, but signature verification fails
    const result = validateAttestation(
      tampered,
      operatorKeys.publicKey,
      attesterKeys.publicKey,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("signature"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Attack 5: Malicious JSON — Prototype Pollution
// ---------------------------------------------------------------------------

describe("Attack 5: Prototype Pollution", () => {
  it("canonicalize rejects objects with __proto__ key", () => {
    // Object.defineProperty on a regular object to create an enumerable
    // __proto__ own property that Object.keys() will enumerate.
    const malicious: Record<string, unknown> = { safe: "value" };
    Object.defineProperty(malicious, "__proto__", {
      value: "pwned",
      enumerable: true,
    });

    expect(() => canonicalize(malicious)).toThrow(/[Ff]orbidden key/);
  });

  it("canonicalize rejects objects with constructor key", () => {
    const malicious = { constructor: "evil", name: "test" };
    expect(() => canonicalize(malicious)).toThrow(/[Ff]orbidden key/);
  });

  it("canonicalize rejects objects with prototype key", () => {
    const malicious = { prototype: "evil", name: "test" };
    expect(() => canonicalize(malicious)).toThrow(/[Ff]orbidden key/);
  });
});

// ---------------------------------------------------------------------------
// Attack 6: Malicious JSON — Oversized Input
// ---------------------------------------------------------------------------

describe("Attack 6: Oversized Input", () => {
  it("canonicalize rejects strings larger than 1 MB", () => {
    // 1 MB = 1,048,576 bytes; add extra to exceed
    const oversized = "x".repeat(1_048_577);
    expect(() => canonicalize(oversized)).toThrow(/exceeds maximum size/);
  });
});

// ---------------------------------------------------------------------------
// Attack 7: Unicode Normalization
// ---------------------------------------------------------------------------

describe("Attack 7: Unicode Normalization", () => {
  it("NFC and NFD representations of the same character produce identical canonical output", () => {
    // "e" + combining acute accent (NFD)
    const nfd = "e\u0301";
    // Pre-composed e-acute (NFC)
    const nfc = "\u00e9";

    // They should look the same but are different JS strings
    expect(nfd).not.toBe(nfc);
    expect(nfd.normalize("NFC")).toBe(nfc);

    // Canonical serialization normalizes to NFC
    const outputNfd = canonicalize({ name: nfd });
    const outputNfc = canonicalize({ name: nfc });
    expect(outputNfd).toBe(outputNfc);
  });

  it("commitments with NFC vs NFD context produce identical results", () => {
    const nfd = "e\u0301";
    const nfc = "\u00e9";
    const bf = new Uint8Array(32).fill(0xab);

    const c1 = createCommitment({
      domain: "test",
      context: { label: nfd },
      value: 100.0,
      blindingFactor: bf,
    });

    const c2 = createCommitment({
      domain: "test",
      context: { label: nfc },
      value: 100.0,
      blindingFactor: bf,
    });

    expect(c1.commitment.hash).toBe(c2.commitment.hash);
  });
});

// ---------------------------------------------------------------------------
// Attack 8: Timestamp Manipulation
// ---------------------------------------------------------------------------

describe("Attack 8: Timestamp Manipulation", () => {
  it("far-future valid_until is not expired", () => {
    const farFuture = "9999-12-31T23:59:59.999Z";
    expect(isExpired(farFuture)).toBe(false);
  });

  it("past valid_until is expired", () => {
    const past = "2020-01-01T00:00:00.000Z";
    expect(isExpired(past)).toBe(true);
  });

  it("attestation with past valid_until triggers expiry warning", () => {
    const { params, operatorKeys, attesterKeys } = makeAttestationParams({
      statement: {
        predicate_type: "THRESHOLD",
        operator: "ABOVE",
        measurement_type: "fuel_margin_pct",
        threshold_ref: "policy-v1",
        valid_from: "2019-01-01T00:00:00.000Z",
        valid_until: "2020-01-01T00:00:00.000Z",
      },
    });

    const attestation = buildAttestation(params);
    const result = validateAttestation(attestation);
    expect(result.warnings.some((w) => w.includes("expired"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Attack 9: Signature Malleability
// ---------------------------------------------------------------------------

describe("Attack 9: Signature Malleability", () => {
  it("flipping the high bit of the last signature byte is rejected", () => {
    const kp = generateKeyPair();
    const message = new TextEncoder().encode("test message");
    const domain = "VERITY2036_ATTESTATION_V2";

    const sig = sign(kp.privateKey, domain, message);
    const sigBytes = hexToBytes(sig.signature);

    // Flip the high bit of the last byte (S value malleability)
    sigBytes[63] = sigBytes[63]! ^ 0x80;
    const malleable = bytesToHex(sigBytes);

    // noble/curves enforces strict S < L check
    const valid = verify(kp.publicKey, domain, message, malleable);
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Attack 10: Commitment Forgery
// ---------------------------------------------------------------------------

describe("Attack 10: Commitment Forgery", () => {
  it("verifying with wrong value fails", () => {
    const result = createCommitment({
      domain: "test",
      context: { asset: "SAT-001" },
      value: 100.0,
    });

    const tamperedSecret = { ...result.secret, value: 99.99 };
    expect(verifyCommitment(result.commitment, tamperedSecret)).toBe(false);
  });

  it("verifying with wrong blinding factor fails", () => {
    const result = createCommitment({
      domain: "test",
      context: { asset: "SAT-001" },
      value: 100.0,
    });

    const wrongBf = new Uint8Array(32).fill(0xff);
    const tamperedSecret = { ...result.secret, blindingFactor: wrongBf };
    expect(verifyCommitment(result.commitment, tamperedSecret)).toBe(false);
  });

  it("verifying with wrong domain fails", () => {
    const result = createCommitment({
      domain: "test",
      context: { asset: "SAT-001" },
      value: 100.0,
    });

    const tamperedSecret = { ...result.secret, domain: "other-domain" };
    expect(verifyCommitment(result.commitment, tamperedSecret)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Attack 11: Empty/Null Attacks
// ---------------------------------------------------------------------------

describe("Attack 11: Empty/Null Attacks", () => {
  it("attestation with empty string fields reports errors", () => {
    const emptyAttestation = {
      attestation_id: "",
      protocol_version: 2 as const,
      tenant_id: "",
      subject: { asset_type: "satellite" as const, asset_id: "" },
      statement: {
        predicate_type: "THRESHOLD" as const,
        operator: "ABOVE" as const,
        measurement_type: "",
        threshold_ref: "",
        valid_from: "",
        valid_until: "",
        sequence_number: 1,
      },
      commitment: { hash: "", scheme: "", version: 2 },
      evidence: {
        evidence_ref: "",
        evidence_hash: "",
        attester_id: "",
        attester_signature: "",
      },
      signatures: { operator_signature: "", operator_key_id: "" },
      metadata: { created_at: "", nonce: "" },
    };

    const result = validateAttestation(emptyAttestation as Attestation);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("attestation with null values in required fields reports errors", () => {
    const nullAttestation = {
      attestation_id: null,
      protocol_version: 2,
      tenant_id: null,
      subject: { asset_type: "satellite", asset_id: null },
      statement: {
        predicate_type: "THRESHOLD",
        operator: "ABOVE",
        measurement_type: null,
        threshold_ref: null,
        valid_from: null,
        valid_until: null,
        sequence_number: 1,
      },
      commitment: { hash: null, scheme: null, version: 2 },
      evidence: {
        evidence_ref: null,
        evidence_hash: null,
        attester_id: null,
        attester_signature: null,
      },
      signatures: { operator_signature: null, operator_key_id: null },
      metadata: { created_at: null, nonce: null },
    };

    const result = validateAttestation(
      nullAttestation as unknown as Attestation,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("proof with empty trusted attester key set returns false", async () => {
    const provider = new ThresholdCommitmentProofProvider();
    const kp = generateKeyPair();

    const proof = await provider.createProof({
      predicateType: "ABOVE",
      actualValue: 50.0,
      thresholdRef: "policy-v1",
      thresholdValue: 10.0,
      domain: "VERITY2036_ATTESTATION_V2",
      context: { regulation: "test" },
      attesterPrivateKey: kp.privateKey,
      attesterPublicKey: kp.publicKey,
      attesterId: "attester-001",
    });

    // Empty trusted set: verification must fail
    const valid = await provider.verifyProof(proof, {
      domain: "VERITY2036_ATTESTATION_V2",
      context: { regulation: "test" },
      trustedAttesterKeys: new Set<string>(),
    });
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Attack 12: Key Revocation Enforcement
// ---------------------------------------------------------------------------

describe("Attack 12: Key Revocation Enforcement", () => {
  it("cannot decrypt a revoked key", async () => {
    const store = new InMemoryKeyStore();
    const manager = new KeyManager({
      store,
      masterPassphrase: "a-very-secure-passphrase-that-is-long-enough",
      defaultExpiryDays: 365,
    });

    // Create a key
    const key = await manager.createKeyPair("tenant-test", "SIGNING");

    // Verify we can decrypt it before revocation
    const privateHex = await manager.decryptPrivateKey(key);
    expect(privateHex).toHaveLength(64); // 32 bytes hex

    // Revoke using the same key for signing the revocation
    const platformRoot = generateKeyPair();
    await manager.revokeKey(
      "tenant-test",
      key.keyId,
      "Compromised",
      platformRoot.privateKey,
    );

    // Fetch updated key record
    const revokedKey = await store.getKey(key.keyId);
    expect(revokedKey).not.toBeNull();
    expect(revokedKey!.status).toBe("REVOKED");

    // Attempt to decrypt the revoked key: should throw
    await expect(manager.decryptPrivateKey(revokedKey!)).rejects.toThrow(
      "Cannot decrypt a revoked key",
    );
  });
});
