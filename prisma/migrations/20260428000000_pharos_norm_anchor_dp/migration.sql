-- Pharos NormAnchor + NormDriftAlert
-- ====================================
--
-- Adds the deterministic norm-index for Pharos-AI Citation-Layer.
-- No vector DB, no embedding API — Postgres tsvector + GIN.
--
-- Why a manual migration: Prisma can't model the `textSearch` tsvector
-- column or the GIN index declaratively. We create the table via
-- standard Prisma CREATE, then add the generated tsvector column +
-- GIN index via raw SQL.

-- ─── NormAnchor ──────────────────────────────────────────────────────

CREATE TABLE "NormAnchor" (
  "id" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "instrument" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "title" TEXT,
  "text" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "supersededById" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NormAnchor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NormAnchor_jurisdiction_instrument_idx"
  ON "NormAnchor"("jurisdiction", "instrument");
CREATE INDEX "NormAnchor_contentHash_idx" ON "NormAnchor"("contentHash");

ALTER TABLE "NormAnchor"
  ADD CONSTRAINT "NormAnchor_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "NormAnchor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── tsvector + GIN (Postgres-specific, can't be declared in Prisma) ──
--
-- Uses 'simple' configuration (no language-specific stemming) because
-- our anchor texts span DE/EN/FR/IT — a single config keeps determinism.
-- Phase 2: per-language tsvectors with the matching dictionary.

ALTER TABLE "NormAnchor"
  ADD COLUMN "textSearch" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce("title", '') || ' ' ||
      coalesce("text", '') || ' ' ||
      coalesce("instrument", '') || ' ' ||
      coalesce("number", '')
    )
  ) STORED;

CREATE INDEX "NormAnchor_textSearch_gin_idx"
  ON "NormAnchor" USING GIN ("textSearch");

-- ─── NormDriftAlert ──────────────────────────────────────────────────

CREATE TABLE "NormDriftAlert" (
  "id" TEXT NOT NULL,
  "normAnchorId" TEXT NOT NULL,
  "oldContentHash" TEXT NOT NULL,
  "newContentHash" TEXT NOT NULL,
  "oversightId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "oldTextSnapshot" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "NormDriftAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NormDriftAlert_normAnchorId_idx" ON "NormDriftAlert"("normAnchorId");
CREATE INDEX "NormDriftAlert_oversightId_status_idx"
  ON "NormDriftAlert"("oversightId", "status");
CREATE INDEX "NormDriftAlert_status_detectedAt_idx"
  ON "NormDriftAlert"("status", "detectedAt");
