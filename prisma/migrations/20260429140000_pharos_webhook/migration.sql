-- Pharos External Webhook Tables
-- ===============================
-- HMAC-secured external operator → authority webhook channel for
-- non-Caelex operators reporting NIS2 incidents to Pharos.

CREATE TABLE "PharosWebhookEndpoint" (
  "id" TEXT NOT NULL,
  "oversightId" TEXT NOT NULL,
  "authorityProfileId" TEXT NOT NULL,
  "externalOperatorId" TEXT NOT NULL,
  "externalOperatorName" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "secretSalt" TEXT NOT NULL,
  "allowedEvents" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "PharosWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PharosWebhookEndpoint_oversightId_idx"
  ON "PharosWebhookEndpoint"("oversightId");
CREATE INDEX "PharosWebhookEndpoint_authorityProfileId_idx"
  ON "PharosWebhookEndpoint"("authorityProfileId");
CREATE INDEX "PharosWebhookEndpoint_externalOperatorId_idx"
  ON "PharosWebhookEndpoint"("externalOperatorId");
CREATE UNIQUE INDEX "PharosWebhookEndpoint_oversightId_externalOperatorId_key"
  ON "PharosWebhookEndpoint"("oversightId", "externalOperatorId");

-- ─── Invocation ledger ───────────────────────────────────────────────

CREATE TABLE "PharosWebhookInvocation" (
  "id" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventType" TEXT NOT NULL,
  "bodyHash" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "workflowCaseId" TEXT,

  CONSTRAINT "PharosWebhookInvocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PharosWebhookInvocation_endpointId_nonce_key"
  ON "PharosWebhookInvocation"("endpointId", "nonce");
CREATE INDEX "PharosWebhookInvocation_endpointId_receivedAt_idx"
  ON "PharosWebhookInvocation"("endpointId", "receivedAt");
CREATE INDEX "PharosWebhookInvocation_status_idx"
  ON "PharosWebhookInvocation"("status");

ALTER TABLE "PharosWebhookInvocation"
  ADD CONSTRAINT "PharosWebhookInvocation_endpointId_fkey"
  FOREIGN KEY ("endpointId") REFERENCES "PharosWebhookEndpoint"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
