-- Atlas Standalone Workspace — Idempotente Migration
-- Erweitert LegalMatter um STANDALONE-Status + nullable clientOrgId

-- 1. Enum-Wert STANDALONE ergänzen
DO $$ BEGIN
  ALTER TYPE "MatterStatus" ADD VALUE IF NOT EXISTS 'STANDALONE' BEFORE 'PENDING_INVITE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. clientOrgId nullable machen (idempotent — ALTER COLUMN DROP NOT NULL ist
--    in Postgres ein no-op wenn die Column schon nullable ist)
ALTER TABLE "LegalMatter" ALTER COLUMN "clientOrgId" DROP NOT NULL;

-- 3. handshakeHash nullable machen — STANDALONE-matters haben keinen
--    Handshake. Idempotent (no-op wenn schon nullable).
ALTER TABLE "LegalMatter" ALTER COLUMN "handshakeHash" DROP NOT NULL;
