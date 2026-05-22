-- Caelex Trade Sprint E1 — Voluntary Self-Disclosure (VSD) workflow.
--
-- Tracks formal disclosures of potential violations to export-control
-- authorities. VSDs cut penalties by 60-80% (BIS Penalty Guidelines)
-- and avoid criminal referral in most cases. The model captures the
-- full lifecycle from internal discovery through authority resolution.
--
-- Schema additions only — no data migration. PDF generation +
-- authority filing portal integration follow in later sprints.

-- CreateEnum
CREATE TYPE "TradeVSDAuthority" AS ENUM (
    'BIS',
    'DDTC',
    'OFAC',
    'BAFA',
    'EU_COMPETENT_AUTHORITY',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "TradeVSDViolationType" AS ENUM (
    'UNLICENSED_EXPORT',
    'MISCLASSIFICATION',
    'PROHIBITED_PARTY',
    'INVALID_LICENSE_EXCEPTION',
    'DEEMED_EXPORT',
    'CATCH_ALL_OMISSION',
    'UNAUTHORIZED_REEXPORT',
    'END_USE_VIOLATION',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "TradeVSDStatus" AS ENUM (
    'DISCOVERED',
    'INVESTIGATING',
    'DRAFTED',
    'SUBMITTED',
    'ACKNOWLEDGED',
    'RESOLVED',
    'WITHDRAWN'
);

-- CreateEnum
CREATE TYPE "TradeVSDOutcome" AS ENUM (
    'NO_ACTION',
    'WARNING_LETTER',
    'CIVIL_PENALTY',
    'SETTLEMENT',
    'CRIMINAL_REFERRAL',
    'WITHDRAWN'
);

-- CreateTable
CREATE TABLE "TradeVoluntaryDisclosure" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authority" "TradeVSDAuthority" NOT NULL,
    "violationType" "TradeVSDViolationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "operationId" TEXT,
    "itemId" TEXT,
    "partyId" TEXT,
    "status" "TradeVSDStatus" NOT NULL DEFAULT 'DISCOVERED',
    "investigatingAt" TIMESTAMP(3),
    "draftedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "filingReference" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "outcome" "TradeVSDOutcome",
    "penaltyAmountUsd" DOUBLE PRECISION,
    "outcomeNotes" TEXT,
    "lastActionById" TEXT,
    "filingDocumentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeVoluntaryDisclosure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeVoluntaryDisclosure_organizationId_status_idx" ON "TradeVoluntaryDisclosure"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TradeVoluntaryDisclosure_organizationId_authority_idx" ON "TradeVoluntaryDisclosure"("organizationId", "authority");

-- CreateIndex
CREATE INDEX "TradeVoluntaryDisclosure_discoveredAt_idx" ON "TradeVoluntaryDisclosure"("discoveredAt");

-- CreateIndex
CREATE INDEX "TradeVoluntaryDisclosure_operationId_idx" ON "TradeVoluntaryDisclosure"("operationId");

-- CreateIndex
CREATE INDEX "TradeVoluntaryDisclosure_itemId_idx" ON "TradeVoluntaryDisclosure"("itemId");

-- CreateIndex
CREATE INDEX "TradeVoluntaryDisclosure_partyId_idx" ON "TradeVoluntaryDisclosure"("partyId");

-- AddForeignKey
ALTER TABLE "TradeVoluntaryDisclosure"
    ADD CONSTRAINT "TradeVoluntaryDisclosure_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeVoluntaryDisclosure"
    ADD CONSTRAINT "TradeVoluntaryDisclosure_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "TradeOperation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeVoluntaryDisclosure"
    ADD CONSTRAINT "TradeVoluntaryDisclosure_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "TradeItem"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeVoluntaryDisclosure"
    ADD CONSTRAINT "TradeVoluntaryDisclosure_partyId_fkey"
    FOREIGN KEY ("partyId") REFERENCES "TradeParty"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeVoluntaryDisclosure"
    ADD CONSTRAINT "TradeVoluntaryDisclosure_lastActionById_fkey"
    FOREIGN KEY ("lastActionById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
