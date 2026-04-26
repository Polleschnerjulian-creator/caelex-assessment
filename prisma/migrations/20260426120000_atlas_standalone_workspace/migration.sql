-- Atlas Standalone Workspace — Idempotente Migration
-- Erweitert LegalMatter um STANDALONE-Status + nullable clientOrgId

-- 1. Enum-Wert STANDALONE ergänzen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'MatterStatus' AND e.enumlabel = 'STANDALONE'
  ) THEN
    ALTER TYPE "MatterStatus" ADD VALUE 'STANDALONE' BEFORE 'PENDING_INVITE';
  END IF;
END$$;

-- 2. clientOrgId nullable machen (idempotent — ALTER COLUMN DROP NOT NULL ist
--    in Postgres ein no-op wenn die Column schon nullable ist)
ALTER TABLE "LegalMatter" ALTER COLUMN "clientOrgId" DROP NOT NULL;
