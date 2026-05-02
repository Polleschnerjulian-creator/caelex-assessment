-- Sprint 8A: AuditTimestampAnchor — quarterly OpenTimestamps anchoring
-- of the audit-log chain head. Additive (new table); zero V1 risk.

CREATE TABLE "AuditTimestampAnchor" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "anchorHash"     TEXT NOT NULL,
  "otsProof"       BYTEA NOT NULL,
  "calendarUrl"    TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "blockHeight"    INTEGER,
  "upgradedAt"     TIMESTAMP(3),
  "errorMessage"   TEXT,
  "submittedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditTimestampAnchor_pkey" PRIMARY KEY ("id")
);

-- "Show me anchors for org X chronologically" — the most common query
-- when an operator's regulator asks for a quarter's proofs.
CREATE INDEX "AuditTimestampAnchor_organizationId_submittedAt_idx"
  ON "AuditTimestampAnchor"("organizationId", "submittedAt");

-- "Find PENDING anchors older than 6h to upgrade" — the upgrade-cron
-- (Sprint 8B) batches by status + age.
CREATE INDEX "AuditTimestampAnchor_status_submittedAt_idx"
  ON "AuditTimestampAnchor"("status", "submittedAt");

ALTER TABLE "AuditTimestampAnchor"
  ADD CONSTRAINT "AuditTimestampAnchor_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
