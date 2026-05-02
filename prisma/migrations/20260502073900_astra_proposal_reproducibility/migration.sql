-- Sprint 6B: AstraProposal reproducibility / EU AI Act audit fields.
-- All additive; existing rows get NULL for all three columns. Non-Astra
-- proposal paths (manual user actions, cron-fired actions) intentionally
-- leave these NULL too.

ALTER TABLE "AstraProposal"
  ADD COLUMN "modelName"       TEXT,
  ADD COLUMN "engineVersion"   TEXT,
  ADD COLUMN "reproducibility" JSONB;

-- Composite index for "show me all proposals from model X since date Y" —
-- the most common forensic query when a model swap regresses behaviour.
CREATE INDEX "AstraProposal_modelName_createdAt_idx"
  ON "AstraProposal"("modelName", "createdAt");
