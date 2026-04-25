-- Phase 5+ — Embeddings on AtlasResearchEntry.
--
-- Adds a vector column for semantic recall. We use a plain
-- DOUBLE PRECISION array rather than pgvector to avoid the extension
-- dependency — the corpus per user is small (max 5,000 entries) and
-- cosine similarity in JavaScript is sub-millisecond at that scale.
-- If a tenant ever crosses ~50k entries, swapping to Upstash Vector
-- (or pgvector if the extension is enabled) is a localised refactor
-- in the recall endpoint without schema changes here.
--
-- Idempotent so it can be applied safely after partial state.

ALTER TABLE "AtlasResearchEntry"
ADD COLUMN IF NOT EXISTS "embedding" DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[];
