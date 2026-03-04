import { z } from "zod";

// Hex string validators
const hex64 = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "Must be 64 lowercase hex chars");
const hex128 = z
  .string()
  .regex(/^[0-9a-f]{128}$/, "Must be 128 lowercase hex chars");
const isoTimestamp = z.string().datetime({ offset: true });
const cuid2Id = z.string().min(1);

export const createAttestationSchema = z.object({
  subject: z.object({
    asset_type: z.string().min(1),
    asset_id: z.string().min(1),
  }),
  statement: z.object({
    predicate_type: z.string().min(1),
    operator: z.string().min(1),
    measurement_type: z.string().min(1),
    threshold_ref: z.string().min(1),
    valid_from: isoTimestamp,
    valid_until: isoTimestamp,
  }),
  commitment: z.object({
    hash: hex64,
    scheme: z.string().min(1),
    version: z.number().int().positive(),
  }),
  evidence: z.object({
    evidence_ref: z.string().min(1),
    evidence_hash: hex64,
    attester_id: cuid2Id,
    attester_signature: hex128,
  }),
  operator_key_id: cuid2Id,
});

export const verifyAttestationSchema = z.union([
  z.object({ attestation_id: cuid2Id }),
  z.object({ attestation: z.record(z.unknown()) }),
]);

export const issueCertificateSchema = z.object({
  attestation_ids: z.array(cuid2Id).min(1).max(100),
  expires_at: isoTimestamp,
  issuer_key_id: cuid2Id,
});

export const verifyCertificateSchema = z.union([
  z.object({ cert_id: cuid2Id }),
  z.object({ certificate: z.record(z.unknown()) }),
]);

export const rotateKeySchema = z.object({
  key_id: cuid2Id,
  overlap_hours: z.number().int().min(1).default(168),
});

export const revokeKeySchema = z.object({
  key_id: cuid2Id,
  reason: z.string().min(1).max(1000),
});

export type CreateAttestationInput = z.infer<typeof createAttestationSchema>;
export type VerifyAttestationInput = z.infer<typeof verifyAttestationSchema>;
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
export type VerifyCertificateInput = z.infer<typeof verifyCertificateSchema>;
export type RotateKeyInput = z.infer<typeof rotateKeySchema>;
export type RevokeKeyInput = z.infer<typeof revokeKeySchema>;
