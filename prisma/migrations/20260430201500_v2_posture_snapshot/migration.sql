-- Comply v2 — Daily PostureSnapshot for sparkline trends
-- =======================================================
-- One row per user per UTC day. Captured by the
-- /api/cron/posture-snapshot job. Powers historical-trend sparklines
-- on /dashboard/posture without recomputing from ComplianceItems on
-- every request.
--
-- Disjoint from the legacy ComplianceSnapshot model (digital twin) —
-- V1 has different status ontology and module groupings, mixing them
-- would lose V2 fidelity. See docs/CAELEX-COMPLY-CONCEPT.md
-- § Reversibility for the V1/V2 isolation discipline.

CREATE TABLE "V2PostureSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "countableItems" INTEGER NOT NULL,
    "attestedItems" INTEGER NOT NULL,
    "openProposals" INTEGER NOT NULL,
    "openTriage" INTEGER NOT NULL,
    "activeSnoozes" INTEGER NOT NULL,
    "attestedThisWeek" INTEGER NOT NULL,
    "fullSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "V2PostureSnapshot_pkey" PRIMARY KEY ("id")
);

-- One snapshot per user per day. Re-running the cron same-day
-- short-circuits via upsert on this constraint.
CREATE UNIQUE INDEX "V2PostureSnapshot_userId_snapshotDate_key"
    ON "V2PostureSnapshot"("userId", "snapshotDate");

-- Sparkline reads scan by (userId, snapshotDate DESC LIMIT n).
CREATE INDEX "V2PostureSnapshot_userId_snapshotDate_idx"
    ON "V2PostureSnapshot"("userId", "snapshotDate");

-- ON DELETE CASCADE so deleting a user removes their snapshot history.
ALTER TABLE "V2PostureSnapshot"
    ADD CONSTRAINT "V2PostureSnapshot_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
