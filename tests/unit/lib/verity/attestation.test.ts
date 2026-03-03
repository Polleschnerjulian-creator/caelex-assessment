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
