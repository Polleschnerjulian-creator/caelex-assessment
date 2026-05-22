-- Caelex Trade Sprint E5 — End-Use Certificate request lifecycle.
--
-- Tracks the issuance, dispatch and validation of EUCs (BAFA C1/C6/C7,
-- BIS-711, DDTC DS-83 and other foreign-jurisdiction equivalents).
-- Required to evidence end-use commitments under §22 AWV / 15 CFR §744
-- / ITAR §126.4(d) and to defend re-export determinations.
--
-- Schema additions only — no data migration. PDF generation, email-to-
-- counterparty dispatch and signed-document upload ship in later sprints
-- (E5b, E5c). Cron-based EXPIRED transition + reminder emails will piggy-
-- back on the existing trade-license-expiry cron path (E5d).

-- CreateEnum
CREATE TYPE "TradeEUCFormType" AS ENUM (
    'BAFA_C1',
    'BAFA_C6',
    'BAFA_C7',
    'BIS_711',
    'DDTC_DS83',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "TradeEUCStatus" AS ENUM (
    'REQUESTED',
    'SENT_TO_PARTY',
    'RECEIVED',
    'VALIDATED',
    'EXPIRED',
    'REVOKED'
);

-- CreateTable
CREATE TABLE "TradeEUCRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formType" "TradeEUCFormType" NOT NULL,
    "partyId" TEXT NOT NULL,
    "operationId" TEXT,
    "status" "TradeEUCStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "lastActionById" TEXT,
    "signedDocumentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeEUCRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeEUCRequest_organizationId_status_idx" ON "TradeEUCRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TradeEUCRequest_organizationId_formType_idx" ON "TradeEUCRequest"("organizationId", "formType");

-- CreateIndex
CREATE INDEX "TradeEUCRequest_partyId_idx" ON "TradeEUCRequest"("partyId");

-- CreateIndex
CREATE INDEX "TradeEUCRequest_operationId_idx" ON "TradeEUCRequest"("operationId");

-- CreateIndex
CREATE INDEX "TradeEUCRequest_validUntil_idx" ON "TradeEUCRequest"("validUntil");

-- AddForeignKey
ALTER TABLE "TradeEUCRequest"
    ADD CONSTRAINT "TradeEUCRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEUCRequest"
    ADD CONSTRAINT "TradeEUCRequest_partyId_fkey"
    FOREIGN KEY ("partyId") REFERENCES "TradeParty"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEUCRequest"
    ADD CONSTRAINT "TradeEUCRequest_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "TradeOperation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEUCRequest"
    ADD CONSTRAINT "TradeEUCRequest_lastActionById_fkey"
    FOREIGN KEY ("lastActionById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
