-- Phase 5 — Personal Research Library.
--
-- Adds the AtlasResearchEntry table for the lawyer's private bookmark
-- library of Atlas answers. Idempotent so it can be applied via Neon
-- console manually or through whichever pipeline runs migrations
-- (the build:deploy `prisma db push` flow has historically been
-- unreliable — see migration 20260425120000 for the schema-drift
-- pattern this codebase has been hardening against).

-- CreateTable
CREATE TABLE IF NOT EXISTS "AtlasResearchEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "query" TEXT,
    "sourceKind" TEXT,
    "sourceMatterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtlasResearchEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "AtlasResearchEntry_userId_createdAt_idx"
ON "AtlasResearchEntry"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AtlasResearchEntry_userId_sourceMatterId_idx"
ON "AtlasResearchEntry"("userId", "sourceMatterId");

-- AddForeignKey (idempotent — guard against duplicate constraint)
DO $$ BEGIN
    ALTER TABLE "AtlasResearchEntry"
    ADD CONSTRAINT "AtlasResearchEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
