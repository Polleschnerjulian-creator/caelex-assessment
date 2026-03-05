/**
 * Verity 2036 -- Zod Schema Validation Tests
 *
 * Tests all 6 Zod schemas from src/validation/schemas.ts:
 *  1. createAttestationSchema
 *  2. verifyAttestationSchema
 *  3. issueCertificateSchema
 *  4. verifyCertificateSchema
 *  5. rotateKeySchema
 *  6. revokeKeySchema
 */

import { describe, it, expect } from "vitest";
import {
  createAttestationSchema,
  verifyAttestationSchema,
  issueCertificateSchema,
  verifyCertificateSchema,
  rotateKeySchema,
  revokeKeySchema,
} from "../../src/validation/schemas.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** 64-char lowercase hex string (32 bytes). */
const VALID_HEX_64 = "a".repeat(64);
/** Valid ISO-8601 timestamp with offset. */
const VALID_TS = "2036-06-15T12:00:00.000Z";

// ---------------------------------------------------------------------------
// createAttestationSchema
// ---------------------------------------------------------------------------

describe("createAttestationSchema", () => {
  const validInput = {
    subject: {
      asset_type: "satellite",
      asset_id: "sat-001",
    },
    statement: {
      predicate_type: "THRESHOLD",
      operator: "ABOVE",
      measurement_type: "fuel_margin",
      threshold_ref: "policy/v3",
      valid_from: VALID_TS,
      valid_until: "2036-12-31T23:59:59.000Z",
    },
    evidence: {
      evidence_ref: "evidence/bundle/123",
      evidence_hash: VALID_HEX_64,
      attester_id: "attester123",
    },
    operator_key_id: "key123",
    actual_value: 42.5,
    commitment_domain: "fuel_margin",
    commitment_context: { sensor_id: "FP-001" },
  };

  it("accepts a fully valid input", () => {
    const result = createAttestationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts when commitment_context is omitted (defaults to {})", () => {
    const { commitment_context: _, ...rest } = validInput;
    const result = createAttestationSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects when subject is missing", () => {
    const { subject: _, ...rest } = validInput;
    const result = createAttestationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when subject.asset_type is empty", () => {
    const input = {
      ...validInput,
      subject: { ...validInput.subject, asset_type: "" },
    };
    const result = createAttestationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when statement is missing", () => {
    const { statement: _, ...rest } = validInput;
    const result = createAttestationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when evidence.evidence_hash is invalid hex", () => {
    const input = {
      ...validInput,
      evidence: { ...validInput.evidence, evidence_hash: "xyz" },
    };
    const result = createAttestationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when actual_value is missing", () => {
    const { actual_value: _, ...rest } = validInput;
    const result = createAttestationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when commitment_domain is missing", () => {
    const { commitment_domain: _, ...rest } = validInput;
    const result = createAttestationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when commitment_domain is empty", () => {
    const input = { ...validInput, commitment_domain: "" };
    const result = createAttestationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when statement.valid_from is not ISO-8601", () => {
    const input = {
      ...validInput,
      statement: { ...validInput.statement, valid_from: "not-a-date" },
    };
    const result = createAttestationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when statement.valid_until is not ISO-8601", () => {
    const input = {
      ...validInput,
      statement: { ...validInput.statement, valid_until: "2036-13-45" },
    };
    const result = createAttestationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when operator_key_id is missing", () => {
    const { operator_key_id: _, ...rest } = validInput;
    const result = createAttestationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when operator_key_id is empty string", () => {
    const input = { ...validInput, operator_key_id: "" };
    const result = createAttestationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verifyAttestationSchema
// ---------------------------------------------------------------------------

describe("verifyAttestationSchema", () => {
  it("accepts attestation_id variant", () => {
    const result = verifyAttestationSchema.safeParse({
      attestation_id: "attest123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts attestation payload variant", () => {
    const result = verifyAttestationSchema.safeParse({
      attestation: { some: "data" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = verifyAttestationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects attestation_id as empty string", () => {
    const result = verifyAttestationSchema.safeParse({ attestation_id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing both attestation_id and attestation", () => {
    const result = verifyAttestationSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// issueCertificateSchema
// ---------------------------------------------------------------------------

describe("issueCertificateSchema", () => {
  const validInput = {
    attestation_ids: ["att1", "att2"],
    expires_at: VALID_TS,
    issuer_key_id: "key456",
  };

  it("accepts valid input", () => {
    const result = issueCertificateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects when attestation_ids is empty (min 1)", () => {
    const input = { ...validInput, attestation_ids: [] };
    const result = issueCertificateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when attestation_ids has more than 100 entries (max 100)", () => {
    const ids = Array.from({ length: 101 }, (_, i) => `att${i}`);
    const input = { ...validInput, attestation_ids: ids };
    const result = issueCertificateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts exactly 100 attestation_ids", () => {
    const ids = Array.from({ length: 100 }, (_, i) => `att${i}`);
    const input = { ...validInput, attestation_ids: ids };
    const result = issueCertificateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts exactly 1 attestation_id", () => {
    const input = { ...validInput, attestation_ids: ["att1"] };
    const result = issueCertificateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects when expires_at is not ISO timestamp", () => {
    const input = { ...validInput, expires_at: "next week" };
    const result = issueCertificateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when issuer_key_id is empty", () => {
    const input = { ...validInput, issuer_key_id: "" };
    const result = issueCertificateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects when issuer_key_id is missing", () => {
    const { issuer_key_id: _, ...rest } = validInput;
    const result = issueCertificateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when attestation_ids contains empty string", () => {
    const input = { ...validInput, attestation_ids: ["att1", ""] };
    const result = issueCertificateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verifyCertificateSchema
// ---------------------------------------------------------------------------

describe("verifyCertificateSchema", () => {
  it("accepts cert_id variant", () => {
    const result = verifyCertificateSchema.safeParse({ cert_id: "cert123" });
    expect(result.success).toBe(true);
  });

  it("accepts certificate payload variant", () => {
    const result = verifyCertificateSchema.safeParse({
      certificate: { some: "data" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty object", () => {
    const result = verifyCertificateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects cert_id as empty string", () => {
    const result = verifyCertificateSchema.safeParse({ cert_id: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rotateKeySchema
// ---------------------------------------------------------------------------

describe("rotateKeySchema", () => {
  it("accepts valid input with overlap_hours", () => {
    const result = rotateKeySchema.safeParse({
      key_id: "key123",
      overlap_hours: 24,
    });
    expect(result.success).toBe(true);
  });

  it("defaults overlap_hours to 168 when omitted", () => {
    const result = rotateKeySchema.safeParse({ key_id: "key123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overlap_hours).toBe(168);
    }
  });

  it("rejects when key_id is empty", () => {
    const result = rotateKeySchema.safeParse({
      key_id: "",
      overlap_hours: 24,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when key_id is missing", () => {
    const result = rotateKeySchema.safeParse({ overlap_hours: 24 });
    expect(result.success).toBe(false);
  });

  it("rejects when overlap_hours is 0 (min 1)", () => {
    const result = rotateKeySchema.safeParse({
      key_id: "key123",
      overlap_hours: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when overlap_hours is negative", () => {
    const result = rotateKeySchema.safeParse({
      key_id: "key123",
      overlap_hours: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when overlap_hours is a float", () => {
    const result = rotateKeySchema.safeParse({
      key_id: "key123",
      overlap_hours: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// revokeKeySchema
// ---------------------------------------------------------------------------

describe("revokeKeySchema", () => {
  it("accepts valid input", () => {
    const result = revokeKeySchema.safeParse({
      key_id: "key123",
      reason: "Compromised by external audit",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when key_id is empty", () => {
    const result = revokeKeySchema.safeParse({
      key_id: "",
      reason: "Compromised",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when reason is empty", () => {
    const result = revokeKeySchema.safeParse({
      key_id: "key123",
      reason: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when reason exceeds 1000 characters", () => {
    const result = revokeKeySchema.safeParse({
      key_id: "key123",
      reason: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts reason at exactly 1000 characters", () => {
    const result = revokeKeySchema.safeParse({
      key_id: "key123",
      reason: "x".repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects when key_id is missing", () => {
    const result = revokeKeySchema.safeParse({ reason: "Compromised" });
    expect(result.success).toBe(false);
  });

  it("rejects when reason is missing", () => {
    const result = revokeKeySchema.safeParse({ key_id: "key123" });
    expect(result.success).toBe(false);
  });
});
