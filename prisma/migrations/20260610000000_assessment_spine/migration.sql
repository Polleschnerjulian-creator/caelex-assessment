-- Ultimate Assessment Spine (2026-06-10 rebuild) — Phase 1, Task 1.3.
--
-- STRICTLY ADDITIVE — safe via `prisma migrate deploy` on the live DB:
--   * 2 new enums  (AssessmentTier, AssessmentProfileStatus)
--   * 2 new tables (OperatorAssessmentProfile, AssessmentVerdictSnapshot)
--   * no changes to any existing table, type or row
--
-- OperatorAssessmentProfile = the single profile spine. `answers` stores a
-- Record<QuestionId, TriStateAnswer> (answered | unsure | not_asked — the
-- binding unsure-encoding convention lives in src/lib/assessment/answers.ts),
-- Zod-validated server-side on every write. `anonymousId` carries quick-tier
-- profiles without an account (httpOnly-cookie token) until claimed.
-- AssessmentVerdictSnapshot pins each computed verdict to the profile version
-- and the rulebook semver it was computed against.
--
-- NOTE: the pre-existing "OperatorProfile" table (org-scoped
-- Context-Omnipresence model) is untouched — different model, kept as-is.

-- CreateEnum
CREATE TYPE "AssessmentTier" AS ENUM ('QUICK', 'FULL');

-- CreateEnum
CREATE TYPE "AssessmentProfileStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "OperatorAssessmentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "anonymousId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tier" "AssessmentTier" NOT NULL DEFAULT 'QUICK',
    "status" "AssessmentProfileStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "currentSection" TEXT,
    "changeTriggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorAssessmentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentVerdictSnapshot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "profileVersion" INTEGER NOT NULL,
    "tier" "AssessmentTier" NOT NULL,
    "rulebookVersion" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "unknownsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentVerdictSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorAssessmentProfile_anonymousId_key" ON "OperatorAssessmentProfile"("anonymousId");

-- CreateIndex
CREATE INDEX "OperatorAssessmentProfile_userId_idx" ON "OperatorAssessmentProfile"("userId");

-- CreateIndex
CREATE INDEX "OperatorAssessmentProfile_updatedAt_idx" ON "OperatorAssessmentProfile"("updatedAt");

-- CreateIndex
CREATE INDEX "AssessmentVerdictSnapshot_profileId_createdAt_idx" ON "AssessmentVerdictSnapshot"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "OperatorAssessmentProfile" ADD CONSTRAINT "OperatorAssessmentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentVerdictSnapshot" ADD CONSTRAINT "AssessmentVerdictSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "OperatorAssessmentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
