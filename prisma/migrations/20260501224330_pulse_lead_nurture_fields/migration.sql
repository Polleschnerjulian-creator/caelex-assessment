-- Sprint 4E: PulseLead nurture-sequence tracking fields.
-- All additive; existing rows default to unsubscribed=false, no stage sent.

ALTER TABLE "PulseLead"
  ADD COLUMN "unsubscribed"     BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "unsubscribedAt"   TIMESTAMP(3),
  ADD COLUMN "lastEmailStage"   TEXT,
  ADD COLUMN "lastEmailSentAt"  TIMESTAMP(3);

CREATE INDEX "PulseLead_lastEmailStage_createdAt_idx"
  ON "PulseLead"("lastEmailStage", "createdAt");
