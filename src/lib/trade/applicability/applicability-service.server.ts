import "server-only";
import { prisma } from "@/lib/prisma";
import { upsertProgramProfile, getProgram } from "@/lib/trade/program-service";
import {
  assessApplicability,
  APPLICABILITY_RULE_VERSION,
  type ApplicabilityAnswers,
  type ApplicabilityResult,
  type ApplicabilitySeed,
} from "./assess-applicability";

/**
 * Caelex Trade — Applicability persistence + program-seed service.
 *
 * `import "server-only"` — never bundled to the client. Bridges the PURE
 * `assessApplicability` engine to the DB:
 *   - getApplicability(orgId)            → reads the persisted snapshot.
 *   - saveApplicability(orgId, …, ackAt) → runs the engine, persists the
 *       snapshot + completion marker + seeds jurisdiction/regimes on
 *       TradeOrgProfile, then seeds TradeComplianceProgram.
 *   - seedProgramFromApplicability(…)    → maps the seed → program profile
 *       via the existing encryption-bounded `upsertProgramProfile`.
 *
 * CONSERVATIVE BY DIRECTION (the safety guard): the program seed only ever
 * RAISES diligence surfaces. It never flips an operator's existing
 * `hasITARItems` / `hasEARItems` / `hasForeignNationals = true` back to
 * false from an out-of-scope verdict — the operator may know better than a
 * 7-question triage; we never override a known-true risk downward.
 */

/** Shape persisted in `applicabilityResultJson` (snapshot for re-render + audit). */
interface ApplicabilitySnapshot {
  answers: ApplicabilityAnswers;
  result: ApplicabilityResult;
  v: number;
}

/**
 * Read the persisted applicability result for an org. Returns null when the
 * org has never completed the triage (NULL snapshot or NULL completedAt) —
 * the home uses that null to show the gate banner.
 */
export async function getApplicability(orgId: string): Promise<{
  result: ApplicabilityResult;
  completedAt: Date;
} | null> {
  const row = await prisma.tradeOrgProfile.findUnique({
    where: { organizationId: orgId },
    select: { applicabilityResultJson: true, applicabilityCompletedAt: true },
  });
  if (!row?.applicabilityResultJson || !row.applicabilityCompletedAt) {
    return null;
  }
  const snapshot = JSON.parse(
    row.applicabilityResultJson,
  ) as ApplicabilitySnapshot;
  return {
    result: snapshot.result,
    completedAt: row.applicabilityCompletedAt,
  };
}

/**
 * Run the pure engine on the supplied answers, persist the snapshot +
 * acknowledgement timestamp + rule version on TradeOrgProfile, seed
 * `primaryExportJurisdiction` / `preferredRegimesJson` on the same row, and
 * seed the program profile. Returns the freshly-computed result for an
 * immediate render. `ackAt` records the R6 acknowledgement time.
 */
export async function saveApplicability(
  orgId: string,
  answers: ApplicabilityAnswers,
  ackAt: Date,
): Promise<ApplicabilityResult> {
  const result = assessApplicability(answers);
  const snapshot: ApplicabilitySnapshot = {
    answers,
    result,
    v: APPLICABILITY_RULE_VERSION,
  };
  const snapshotJson = JSON.stringify(snapshot);
  const preferredRegimesJson = JSON.stringify(result.seed.preferredRegimes);

  await prisma.tradeOrgProfile.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      primaryExportJurisdiction: result.seed.primaryExportJurisdiction,
      preferredRegimesJson,
      applicabilityResultJson: snapshotJson,
      applicabilityCompletedAt: ackAt,
      applicabilityRuleVersion: APPLICABILITY_RULE_VERSION,
    },
    update: {
      primaryExportJurisdiction: result.seed.primaryExportJurisdiction,
      preferredRegimesJson,
      applicabilityResultJson: snapshotJson,
      applicabilityCompletedAt: ackAt,
      applicabilityRuleVersion: APPLICABILITY_RULE_VERSION,
    },
  });

  await seedProgramFromApplicability(orgId, result.seed);
  return result;
}

/**
 * Map the applicability seed onto the TradeComplianceProgram profile via the
 * encryption-bounded `upsertProgramProfile`. Idempotent (upsert-merge).
 *
 * UPWARD-ONLY: a known-true risk flag is preserved; otherwise the seed value
 * is taken. We never write `false` over an existing `true` — so an
 * out-of-scope verdict can never suppress a surface the operator already
 * flagged.
 */
export async function seedProgramFromApplicability(
  orgId: string,
  seed: ApplicabilitySeed,
): Promise<void> {
  const existing = await getProgram(orgId);
  await upsertProgramProfile(orgId, {
    hasITARItems: (existing?.hasITARItems ?? false) || seed.hasItarItems,
    hasEARItems: (existing?.hasEARItems ?? false) || seed.hasEarItems,
    hasForeignNationals:
      (existing?.hasForeignNationals ?? false) || seed.hasForeignNationals,
    companyTypesJson: JSON.stringify(seed.companyTypes),
  });
}
