-- Caelex Trade Sprint E4 — Re-Export Consent Letter lifecycle.
--
-- Tracks the issuance and approval of re-export consent letters from
-- original exporters to importers who want to re-export controlled
-- items to a new destination. Required to evidence authorisation
-- under §17 AWV / EAR §734.16 / Art. 11 EU 2021/821.
--
-- Schema additions only — no data migration. PDF generation +
-- email dispatch land in later sprints. Cron-driven EXPIRED
-- transition follows the EUC pattern (E5d).

-- CreateEnum
CREATE TYPE "TradeReexportFormType" AS ENUM (
    'BIS_REEXPORT_AUTH',
    'BAFA_REEXPORT_AUTH',
    'EU_INTRA_REEXPORT',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "TradeReexportStatus" AS ENUM (
    'DRAFTED',
    'SENT',
    'APPROVED',
    'DENIED',
    'EXPIRED',
    'REVOKED'
);

-- CreateTable
CREATE TABLE "TradeReexportConsent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formType" "TradeReexportFormType" NOT NULL,
    "originalLicenseNumber" TEXT,
    "originalExporterName" TEXT NOT NULL,
    "originalExporterCountry" TEXT NOT NULL,
    "requestingPartyId" TEXT NOT NULL,
    "newDestinationCountry" TEXT NOT NULL,
    "newEndUserName" TEXT NOT NULL,
    "operationId" TEXT,
    "status" "TradeReexportStatus" NOT NULL DEFAULT 'DRAFTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "lastActionById" TEXT,
    "denialReason" TEXT,
    "signedDocumentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeReexportConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeReexportConsent_organizationId_status_idx" ON "TradeReexportConsent"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TradeReexportConsent_organizationId_formType_idx" ON "TradeReexportConsent"("organizationId", "formType");

-- CreateIndex
CREATE INDEX "TradeReexportConsent_requestingPartyId_idx" ON "TradeReexportConsent"("requestingPartyId");

-- CreateIndex
CREATE INDEX "TradeReexportConsent_operationId_idx" ON "TradeReexportConsent"("operationId");

-- CreateIndex
CREATE INDEX "TradeReexportConsent_validUntil_idx" ON "TradeReexportConsent"("validUntil");

-- AddForeignKey
ALTER TABLE "TradeReexportConsent"
    ADD CONSTRAINT "TradeReexportConsent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeReexportConsent"
    ADD CONSTRAINT "TradeReexportConsent_requestingPartyId_fkey"
    FOREIGN KEY ("requestingPartyId") REFERENCES "TradeParty"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeReexportConsent"
    ADD CONSTRAINT "TradeReexportConsent_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "TradeOperation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeReexportConsent"
    ADD CONSTRAINT "TradeReexportConsent_lastActionById_fkey"
    FOREIGN KEY ("lastActionById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
