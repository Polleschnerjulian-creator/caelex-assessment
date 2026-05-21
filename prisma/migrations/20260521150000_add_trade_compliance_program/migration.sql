-- Caelex Trade Sprint T4 — Posture layer for org-scoped compliance program.
--
-- Replaces the user-scoped legacy ExportControlAssessment (under
-- /dashboard/modules/export-control) with an org-scoped model that
-- lives natively in the new Trade product. 1:1 with Organization.
-- Created lazily on first /trade/program load.
--
-- Sensitive fields (`ddtcRegistrationNoEnc`, `empoweredOfficialEmailEnc`)
-- store AES-256-GCM ciphertext produced by src/lib/encryption.ts.
-- T5 migrates legacy data into this schema.

-- CreateEnum
CREATE TYPE "TradeProgramStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TradeRequirementStatus" AS ENUM ('COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_ASSESSED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "TradeComplianceProgram" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "TradeProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "companyTypesJson" TEXT,
    "hasITARItems" BOOLEAN NOT NULL DEFAULT false,
    "hasEARItems" BOOLEAN NOT NULL DEFAULT false,
    "hasForeignNationals" BOOLEAN NOT NULL DEFAULT false,
    "foreignNationalCountries" TEXT,
    "exportsToCountries" TEXT,
    "hasTechnologyTransfer" BOOLEAN NOT NULL DEFAULT false,
    "hasDefenseContracts" BOOLEAN NOT NULL DEFAULT false,
    "hasManufacturingAbroad" BOOLEAN NOT NULL DEFAULT false,
    "hasJointVentures" BOOLEAN NOT NULL DEFAULT false,
    "annualExportValueEur" DOUBLE PRECISION,
    "registeredWithDDTC" BOOLEAN NOT NULL DEFAULT false,
    "ddtcRegistrationNoEnc" TEXT,
    "ddtcRegistrationExpiry" TIMESTAMP(3),
    "hasTCP" BOOLEAN NOT NULL DEFAULT false,
    "tcpLastReviewDate" TIMESTAMP(3),
    "hasECL" BOOLEAN NOT NULL DEFAULT false,
    "hasAutomatedScreening" BOOLEAN NOT NULL DEFAULT false,
    "screeningVendor" TEXT,
    "empoweredOfficialName" TEXT,
    "empoweredOfficialEmailEnc" TEXT,
    "empoweredOfficialTitle" TEXT,
    "jurisdictionDetermination" TEXT,
    "jurisdictionDeterminationDate" TIMESTAMP(3),
    "hasCJRequest" BOOLEAN NOT NULL DEFAULT false,
    "cjRequestDate" TIMESTAMP(3),
    "cjDeterminationDate" TIMESTAMP(3),
    "cjDetermination" TEXT,
    "activeITARLicenses" INTEGER,
    "pendingITARLicenses" INTEGER,
    "activeTAAs" INTEGER,
    "activeMLAs" INTEGER,
    "activeEARLicenses" INTEGER,
    "pendingEARLicenses" INTEGER,
    "usesLicenseExceptions" BOOLEAN NOT NULL DEFAULT false,
    "licenseExceptionsUsed" TEXT,
    "lastTrainingDate" TIMESTAMP(3),
    "nextTrainingDue" TIMESTAMP(3),
    "trainingCompletionRate" DOUBLE PRECISION,
    "lastAuditDate" TIMESTAMP(3),
    "nextAuditDue" TIMESTAMP(3),
    "lastAuditFindings" TEXT,
    "hasVoluntaryDisclosures" BOOLEAN NOT NULL DEFAULT false,
    "voluntaryDisclosureCount" INTEGER,
    "lastVoluntaryDisclosureDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeComplianceProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeProgramRequirementStatus" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "TradeRequirementStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "notes" TEXT,
    "evidenceNotes" TEXT,
    "targetDate" TIMESTAMP(3),
    "responsibleParty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeProgramRequirementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeComplianceProgram_organizationId_key" ON "TradeComplianceProgram"("organizationId");

-- CreateIndex
CREATE INDEX "TradeComplianceProgram_status_idx" ON "TradeComplianceProgram"("status");

-- CreateIndex
CREATE INDEX "TradeComplianceProgram_hasITARItems_idx" ON "TradeComplianceProgram"("hasITARItems");

-- CreateIndex
CREATE INDEX "TradeComplianceProgram_hasEARItems_idx" ON "TradeComplianceProgram"("hasEARItems");

-- CreateIndex
CREATE INDEX "TradeComplianceProgram_nextTrainingDue_idx" ON "TradeComplianceProgram"("nextTrainingDue");

-- CreateIndex
CREATE INDEX "TradeComplianceProgram_nextAuditDue_idx" ON "TradeComplianceProgram"("nextAuditDue");

-- CreateIndex
CREATE INDEX "TradeProgramRequirementStatus_programId_idx" ON "TradeProgramRequirementStatus"("programId");

-- CreateIndex
CREATE INDEX "TradeProgramRequirementStatus_status_idx" ON "TradeProgramRequirementStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TradeProgramRequirementStatus_programId_requirementId_key" ON "TradeProgramRequirementStatus"("programId", "requirementId");

-- AddForeignKey
ALTER TABLE "TradeComplianceProgram" ADD CONSTRAINT "TradeComplianceProgram_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeProgramRequirementStatus" ADD CONSTRAINT "TradeProgramRequirementStatus_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TradeComplianceProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
