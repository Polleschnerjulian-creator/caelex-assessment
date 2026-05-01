-- Sprint 1A: Verified-Profile-Tier-Extension
--
-- Extends DerivationTrace (existing append-only provenance ledger) with:
--   1. VerificationTier enum (T0_UNVERIFIED .. T5_CRYPTOGRAPHIC_PROOF)
--   2. Hash-chain fields (sourceHash, prevHash, entryHash)
--   3. Verification metadata (verifiedAt, verifiedBy, attestationRef)
--   4. Revocation fields (revokedAt, revokedReason)
--
-- All additive, all nullable. Existing rows + existing consumers continue
-- to work unchanged. See ADR-008 in docs/CAELEX-BUILD-PLAN-LIVING-DOC.md.

-- 1. Create the VerificationTier enum
CREATE TYPE "VerificationTier" AS ENUM (
  'T0_UNVERIFIED',
  'T1_SELF_CONFIRMED',
  'T2_SOURCE_VERIFIED',
  'T3_COUNSEL_ATTESTED',
  'T4_AUTHORITY_VERIFIED',
  'T5_CRYPTOGRAPHIC_PROOF'
);

-- 2. Add nullable verification + hash-chain columns to DerivationTrace
ALTER TABLE "DerivationTrace"
  ADD COLUMN "verificationTier" "VerificationTier",
  ADD COLUMN "sourceHash"      VARCHAR(64),
  ADD COLUMN "prevHash"        VARCHAR(72),
  ADD COLUMN "entryHash"       VARCHAR(64),
  ADD COLUMN "verifiedAt"      TIMESTAMP(3),
  ADD COLUMN "verifiedBy"      TEXT,
  ADD COLUMN "attestationRef"  JSONB,
  ADD COLUMN "revokedAt"       TIMESTAMP(3),
  ADD COLUMN "revokedReason"   TEXT;

-- 3. Indices for tier filtering, hash lookup, and revocation scans
CREATE INDEX "DerivationTrace_verificationTier_idx"
  ON "DerivationTrace"("verificationTier");

CREATE INDEX "DerivationTrace_entryHash_idx"
  ON "DerivationTrace"("entryHash");

CREATE INDEX "DerivationTrace_revokedAt_idx"
  ON "DerivationTrace"("revokedAt");
