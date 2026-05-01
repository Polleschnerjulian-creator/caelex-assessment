-- Sprint 3A: CAELEX Operator Workflow Foundation (COWF) — schema bootstrap
--
-- Adds 6 tables for the v2 workflow engine described in
-- docs/CAELEX-OPERATOR-WORKFLOW-FOUNDATION.md. Purely additive — V1's
-- WorkflowCase / WorkflowTransition / AuthorizationWorkflow are untouched.
--
--   1. OperatorWorkflowDef          — workflow templates (versioned)
--   2. OperatorWorkflowInstance     — concrete running executions
--   3. WorkflowEvent                — append-only hash-chained event stream
--   4. WorkflowSchedule             — time-based wakeups (Vercel cron polled)
--   5. WorkflowEventListener        — event-based wakeups
--   6. WorkflowApprovalSlot         — multi-actor approval slots
--
-- See ADR-013 (build plan) for the rationale.

-- ─── 1. OperatorWorkflowDef ────────────────────────────────────────────────
CREATE TABLE "OperatorWorkflowDef" (
  "id"          TEXT      NOT NULL DEFAULT gen_random_uuid(),
  "name"        TEXT      NOT NULL,
  "version"     INTEGER   NOT NULL,
  "description" TEXT      NOT NULL,
  "states"      JSONB     NOT NULL,
  "steps"       JSONB     NOT NULL,
  "subjectType" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperatorWorkflowDef_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperatorWorkflowDef_name_version_key"
  ON "OperatorWorkflowDef"("name", "version");
CREATE INDEX "OperatorWorkflowDef_name_idx"
  ON "OperatorWorkflowDef"("name");

-- ─── 2. OperatorWorkflowInstance ───────────────────────────────────────────
CREATE TABLE "OperatorWorkflowInstance" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid(),
  "defId"          TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subjectType"    TEXT,
  "subjectId"      TEXT,
  "currentState"   TEXT NOT NULL,
  "actionableBy"   JSONB,
  "pausedUntil"    TIMESTAMP(3),
  "hardDeadline"   TIMESTAMP(3),
  "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"    TIMESTAMP(3),
  "archivedAt"     TIMESTAMP(3),
  CONSTRAINT "OperatorWorkflowInstance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperatorWorkflowInstance_defId_fkey"
    FOREIGN KEY ("defId") REFERENCES "OperatorWorkflowDef"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "OperatorWorkflowInstance_userId_currentState_idx"
  ON "OperatorWorkflowInstance"("userId", "currentState");
CREATE INDEX "OperatorWorkflowInstance_hardDeadline_idx"
  ON "OperatorWorkflowInstance"("hardDeadline");
CREATE INDEX "OperatorWorkflowInstance_organizationId_currentState_idx"
  ON "OperatorWorkflowInstance"("organizationId", "currentState");
CREATE INDEX "OperatorWorkflowInstance_defId_currentState_idx"
  ON "OperatorWorkflowInstance"("defId", "currentState");
CREATE INDEX "OperatorWorkflowInstance_archivedAt_idx"
  ON "OperatorWorkflowInstance"("archivedAt");

-- ─── 3. WorkflowEvent (append-only, hash-chained) ──────────────────────────
CREATE TABLE "WorkflowEvent" (
  "id"             TEXT          NOT NULL DEFAULT gen_random_uuid(),
  "workflowId"     TEXT          NOT NULL,
  "sequence"       INTEGER       NOT NULL,
  "eventType"      TEXT          NOT NULL,
  "causedBy"       TEXT          NOT NULL,
  "payload"        JSONB         NOT NULL,
  "resultingState" TEXT,
  "prevHash"       VARCHAR(80)   NOT NULL,
  "entryHash"      VARCHAR(64)   NOT NULL,
  "occurredAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkflowEvent_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "OperatorWorkflowInstance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkflowEvent_workflowId_sequence_key"
  ON "WorkflowEvent"("workflowId", "sequence");
CREATE INDEX "WorkflowEvent_workflowId_occurredAt_idx"
  ON "WorkflowEvent"("workflowId", "occurredAt");
CREATE INDEX "WorkflowEvent_eventType_idx"
  ON "WorkflowEvent"("eventType");
CREATE INDEX "WorkflowEvent_entryHash_idx"
  ON "WorkflowEvent"("entryHash");

-- ─── 4. WorkflowSchedule (time-based wakeups) ──────────────────────────────
CREATE TABLE "WorkflowSchedule" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid(),
  "workflowId"   TEXT         NOT NULL,
  "stepKey"      TEXT         NOT NULL,
  "fireAt"       TIMESTAMP(3) NOT NULL,
  "status"       TEXT         NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER      NOT NULL DEFAULT 0,
  "lastError"    TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firedAt"      TIMESTAMP(3),
  CONSTRAINT "WorkflowSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkflowSchedule_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "OperatorWorkflowInstance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WorkflowSchedule_status_fireAt_idx"
  ON "WorkflowSchedule"("status", "fireAt");
CREATE INDEX "WorkflowSchedule_workflowId_status_idx"
  ON "WorkflowSchedule"("workflowId", "status");

-- ─── 5. WorkflowEventListener (event-based wakeups) ────────────────────────
CREATE TABLE "WorkflowEventListener" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid(),
  "workflowId" TEXT NOT NULL,
  "stepKey"    TEXT NOT NULL,
  "eventType"  TEXT NOT NULL,
  "predicate"  JSONB,
  "status"     TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firedAt"    TIMESTAMP(3),
  CONSTRAINT "WorkflowEventListener_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkflowEventListener_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "OperatorWorkflowInstance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WorkflowEventListener_eventType_status_idx"
  ON "WorkflowEventListener"("eventType", "status");
CREATE INDEX "WorkflowEventListener_expiresAt_status_idx"
  ON "WorkflowEventListener"("expiresAt", "status");
CREATE INDEX "WorkflowEventListener_workflowId_status_idx"
  ON "WorkflowEventListener"("workflowId", "status");

-- ─── 6. WorkflowApprovalSlot (multi-actor) ─────────────────────────────────
CREATE TABLE "WorkflowApprovalSlot" (
  "id"              TEXT         NOT NULL DEFAULT gen_random_uuid(),
  "workflowId"      TEXT         NOT NULL,
  "stepKey"         TEXT         NOT NULL,
  "requiredRole"    TEXT         NOT NULL,
  "approvedBy"      TEXT,
  "approvedAt"      TIMESTAMP(3),
  "signature"       TEXT,
  "rationale"       TEXT,
  "rejectedAt"      TIMESTAMP(3),
  "rejectedBy"      TEXT,
  "rejectionReason" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowApprovalSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkflowApprovalSlot_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "OperatorWorkflowInstance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WorkflowApprovalSlot_workflowId_stepKey_idx"
  ON "WorkflowApprovalSlot"("workflowId", "stepKey");
CREATE UNIQUE INDEX "WorkflowApprovalSlot_workflowId_stepKey_requiredRole_key"
  ON "WorkflowApprovalSlot"("workflowId", "stepKey", "requiredRole");
