-- Phase AB-2 schema-drift fix.
--
-- The Organization.orgType column + OrganizationType enum were added
-- to schema.prisma some time ago for the bilateral handshake (Atlas
-- vs. Caelex side discrimination), but `prisma db push` in the
-- Vercel build:deploy pipeline failed silently (the `|| echo` swallow
-- masked the failure) so prod never received the column. Result:
-- /api/network/matters and /api/atlas/organizations/search returned
-- 500 with PrismaClientKnownRequestError on every call.
--
-- This migration brings prod in line with schema. Idempotent so it
-- works whether or not the type/column already partially exist
-- (e.g. created manually via Neon console).

-- CreateEnum (idempotent — guarded against concurrent / partial state)
DO $$ BEGIN
    CREATE TYPE "OrganizationType" AS ENUM ('OPERATOR', 'LAW_FIRM', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable (idempotent)
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "orgType" "OrganizationType" NOT NULL DEFAULT 'OPERATOR';
