-- Pharos — Schema-Foundation für die Behörden-Plattform.
--
-- Drittes Pillar des Caelex-Ökosystems (siehe docs/PHAROS-CONCEPT.md).
-- Diese Migration ist additiv + idempotent — keine destruktiven
-- Operationen. Mehrfaches Re-Run ist sicher.
--
-- Schema:
--   1. OrganizationType enum bekommt AUTHORITY-Variante
--   2. AuthorityType enum (BAFA, BNETZA, BMWK, BMVG, BSI, ...)
--   3. OversightStatus enum (PENDING_OPERATOR_ACCEPT, ACTIVE, ...)
--   4. OversightAccessAction enum (READ_ASSESSMENT, AI_SCREEN, ...)
--   5. AuthorityProfile table (1:1 zu Organization)
--   6. OversightRelationship table (bilateral handshake mit MDF/VDF)
--   7. OversightAccessLog table (hash-chain audit, like LegalMatterAccessLog)

-- ─── 1. Erweitere OrganizationType enum ────────────────────────────
DO $$ BEGIN
  ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'AUTHORITY';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 2-4. Neue Enums ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AuthorityType" AS ENUM (
    'BAFA',
    'BNETZA',
    'BMWK',
    'BMVG',
    'BSI',
    'BAFIN',
    'ESA_LIAISON',
    'EU_COMMISSION',
    'NATO_NCIA',
    'EU_MEMBER_STATE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OversightStatus" AS ENUM (
    'PENDING_OPERATOR_ACCEPT',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED',
    'REVOKED',
    'DISPUTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OversightAccessAction" AS ENUM (
    'READ_COMPLIANCE_HEATMAP',
    'READ_ASSESSMENT',
    'READ_AUTHORIZATION',
    'READ_DOCUMENT',
    'READ_INCIDENT',
    'READ_TIMELINE',
    'EXPORT_COMPLIANCE_PACKAGE',
    'AI_SCREEN',
    'AI_ANOMALY_SCAN',
    'OVERSIGHT_INITIATED',
    'OVERSIGHT_ACCEPTED',
    'OVERSIGHT_DISPUTED',
    'OVERSIGHT_SUSPENDED',
    'OVERSIGHT_RESUMED',
    'OVERSIGHT_CLOSED',
    'OVERSIGHT_REVOKED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 5. AuthorityProfile (1:1 zu Organization) ─────────────────────
CREATE TABLE IF NOT EXISTS "AuthorityProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorityType" "AuthorityType" NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "oversightCategories" JSONB NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "publicWebsite" TEXT,
    "legalReference" TEXT,
    "publicSigningKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthorityProfile_organizationId_key"
ON "AuthorityProfile"("organizationId");

CREATE INDEX IF NOT EXISTS "AuthorityProfile_authorityType_idx"
ON "AuthorityProfile"("authorityType");

CREATE INDEX IF NOT EXISTS "AuthorityProfile_jurisdiction_idx"
ON "AuthorityProfile"("jurisdiction");

DO $$ BEGIN
  ALTER TABLE "AuthorityProfile"
    ADD CONSTRAINT "AuthorityProfile_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 6. OversightRelationship (bilateral handshake) ────────────────
CREATE TABLE IF NOT EXISTS "OversightRelationship" (
    "id" TEXT NOT NULL,
    "authorityProfileId" TEXT NOT NULL,
    "operatorOrgId" TEXT NOT NULL,
    "oversightTitle" TEXT NOT NULL,
    "oversightReference" TEXT,
    "legalReference" TEXT NOT NULL,
    "mandatoryDisclosure" JSONB NOT NULL,
    "voluntaryDisclosure" JSONB NOT NULL,
    "status" "OversightStatus" NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "endedAt" TIMESTAMP(3),
    "endedBy" TEXT,
    "endReason" TEXT,
    "disputedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "handshakeHash" TEXT NOT NULL,
    "acceptanceTokenHash" TEXT,
    "acceptanceTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OversightRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OversightRelationship_acceptanceTokenHash_key"
ON "OversightRelationship"("acceptanceTokenHash");

CREATE UNIQUE INDEX IF NOT EXISTS "OversightRelationship_authorityProfileId_operatorOrgId_overs_key"
ON "OversightRelationship"("authorityProfileId", "operatorOrgId", "oversightReference");

CREATE INDEX IF NOT EXISTS "OversightRelationship_authorityProfileId_status_idx"
ON "OversightRelationship"("authorityProfileId", "status");

CREATE INDEX IF NOT EXISTS "OversightRelationship_operatorOrgId_status_idx"
ON "OversightRelationship"("operatorOrgId", "status");

CREATE INDEX IF NOT EXISTS "OversightRelationship_effectiveUntil_idx"
ON "OversightRelationship"("effectiveUntil");

DO $$ BEGIN
  ALTER TABLE "OversightRelationship"
    ADD CONSTRAINT "OversightRelationship_authorityProfileId_fkey"
    FOREIGN KEY ("authorityProfileId") REFERENCES "AuthorityProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "OversightRelationship"
    ADD CONSTRAINT "OversightRelationship_operatorOrgId_fkey"
    FOREIGN KEY ("operatorOrgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 7. OversightAccessLog (hash-chain audit) ──────────────────────
CREATE TABLE IF NOT EXISTS "OversightAccessLog" (
    "id" TEXT NOT NULL,
    "oversightId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorOrgId" TEXT NOT NULL,
    "action" "OversightAccessAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "matterScope" TEXT NOT NULL,
    "context" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "previousHash" TEXT,
    "entryHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OversightAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OversightAccessLog_oversightId_createdAt_idx"
ON "OversightAccessLog"("oversightId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "OversightAccessLog"
    ADD CONSTRAINT "OversightAccessLog_oversightId_fkey"
    FOREIGN KEY ("oversightId") REFERENCES "OversightRelationship"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
