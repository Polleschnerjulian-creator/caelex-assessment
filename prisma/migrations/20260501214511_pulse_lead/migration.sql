-- Sprint 4A: PulseLead — public-pulse-tool lead capture
--
-- Stores every /pulse cross-verification run as a sales lead. Per ADR-002
-- (V1-coexistence): purely additive, no V1 modifications.

CREATE TABLE "PulseLead" (
  "id"              TEXT         NOT NULL DEFAULT gen_random_uuid(),
  "legalName"       TEXT         NOT NULL,
  "vatId"           TEXT,
  "email"           TEXT         NOT NULL,
  "ipAddress"       TEXT,
  "userAgent"       TEXT,
  "detectionResult" JSONB,
  "utmSource"       TEXT,
  "utmMedium"       TEXT,
  "utmCampaign"     TEXT,
  "referrer"        TEXT,
  "status"          TEXT         NOT NULL DEFAULT 'NEW',
  "convertedToOrgId"  TEXT,
  "convertedToUserId" TEXT,
  "convertedAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PulseLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PulseLead_email_idx"     ON "PulseLead"("email");
CREATE INDEX "PulseLead_status_idx"    ON "PulseLead"("status");
CREATE INDEX "PulseLead_createdAt_idx" ON "PulseLead"("createdAt");
CREATE INDEX "PulseLead_vatId_idx"     ON "PulseLead"("vatId");
