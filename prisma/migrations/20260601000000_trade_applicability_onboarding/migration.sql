-- Caelex Trade — Export-Control Applicability Onboarding (front-door triage).
--
-- Persists the result of the ~7-question applicability triage on the
-- existing per-org TradeOrgProfile row, so the Trade home can gate on
-- completion and the result page can re-render without recomputing.
--
-- STRICTLY ADDITIVE + NULLABLE — zero backfill, safe via
-- `prisma migrate deploy` on the live DB:
--   * applicabilityResultJson  — JSON snapshot (answers + verdicts + rule
--                                 version). NULL = triage never completed.
--   * applicabilityCompletedAt — acknowledgement timestamp. NULL = not done.
--   * applicabilityRuleVersion — rule-set version (APPLICABILITY_RULE_VERSION)
--                                 that produced the snapshot, for staleness
--                                 detection after a future rule change.
--
-- Existing rows simply read NULL on all three columns (= "not done", the
-- home shows the gate banner). No NOT NULL, no DEFAULT, no data migration.
-- The richer answer-derived booleans (hasITARItems / hasEARItems /
-- hasForeignNationals / companyTypesJson) are seeded into the existing
-- TradeComplianceProgram columns at runtime via program-service — no schema
-- work there.

-- AlterTable
ALTER TABLE "TradeOrgProfile" ADD COLUMN     "applicabilityCompletedAt" TIMESTAMP(3),
ADD COLUMN     "applicabilityResultJson" TEXT,
ADD COLUMN     "applicabilityRuleVersion" INTEGER;
