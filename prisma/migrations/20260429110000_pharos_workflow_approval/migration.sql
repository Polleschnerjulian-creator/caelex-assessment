-- Pharos Workflow + Approval Persistence
-- ========================================
-- Phase-2-Persistenz für die in-memory FSMs aus
-- src/lib/pharos/workflow-fsm.ts und Approval-Requests aus
-- src/lib/pharos/multi-party-approval.ts.

-- ─── WorkflowCase ─────────────────────────────────────────────────────

CREATE TABLE "WorkflowCase" (
  "id" TEXT NOT NULL,
  "fsmId" TEXT NOT NULL,
  "caseRef" TEXT NOT NULL,
  "oversightId" TEXT,
  "authorityProfileId" TEXT,
  "operatorOrgId" TEXT,
  "currentState" TEXT NOT NULL,
  "enteredStateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "lastTransitionHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),

  CONSTRAINT "WorkflowCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowCase_caseRef_fsmId_key"
  ON "WorkflowCase"("caseRef", "fsmId");
CREATE INDEX "WorkflowCase_fsmId_currentState_idx"
  ON "WorkflowCase"("fsmId", "currentState");
CREATE INDEX "WorkflowCase_oversightId_idx" ON "WorkflowCase"("oversightId");
CREATE INDEX "WorkflowCase_authorityProfileId_idx"
  ON "WorkflowCase"("authorityProfileId");
CREATE INDEX "WorkflowCase_operatorOrgId_idx"
  ON "WorkflowCase"("operatorOrgId");
CREATE INDEX "WorkflowCase_enteredStateAt_idx"
  ON "WorkflowCase"("enteredStateAt");

-- ─── WorkflowTransition ───────────────────────────────────────────────

CREATE TABLE "WorkflowTransition" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "fromState" TEXT NOT NULL,
  "toState" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "reason" TEXT,
  "payload" JSONB,
  "actorUserId" TEXT,
  "previousHash" TEXT,
  "transitionHash" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "publicKeyBase64" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowTransition_caseId_occurredAt_idx"
  ON "WorkflowTransition"("caseId", "occurredAt");
CREATE INDEX "WorkflowTransition_transitionHash_idx"
  ON "WorkflowTransition"("transitionHash");

ALTER TABLE "WorkflowTransition"
  ADD CONSTRAINT "WorkflowTransition_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "WorkflowCase"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ApprovalRequest ──────────────────────────────────────────────────

CREATE TABLE "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "authorityProfileId" TEXT NOT NULL,
  "oversightId" TEXT,
  "initiatedBy" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "aggregateHash" TEXT,
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),

  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApprovalRequest_authorityProfileId_status_idx"
  ON "ApprovalRequest"("authorityProfileId", "status");
CREATE INDEX "ApprovalRequest_oversightId_idx"
  ON "ApprovalRequest"("oversightId");
CREATE INDEX "ApprovalRequest_status_expiresAt_idx"
  ON "ApprovalRequest"("status", "expiresAt");
CREATE INDEX "ApprovalRequest_payloadHash_idx"
  ON "ApprovalRequest"("payloadHash");

-- ─── ApprovalSignature ────────────────────────────────────────────────

CREATE TABLE "ApprovalSignature" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "approverUserId" TEXT NOT NULL,
  "approverRole" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "publicKeyBase64" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApprovalSignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApprovalSignature_requestId_approverUserId_key"
  ON "ApprovalSignature"("requestId", "approverUserId");
CREATE INDEX "ApprovalSignature_requestId_idx"
  ON "ApprovalSignature"("requestId");
CREATE INDEX "ApprovalSignature_approverUserId_idx"
  ON "ApprovalSignature"("approverUserId");

ALTER TABLE "ApprovalSignature"
  ADD CONSTRAINT "ApprovalSignature_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
