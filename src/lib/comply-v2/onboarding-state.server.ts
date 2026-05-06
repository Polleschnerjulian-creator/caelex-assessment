import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Onboarding setup state — computed server-side, used by:
 *   - V2Sidebar to render the "Setup N/4" progress badge
 *   - /dashboard/today smart empty state to pick the right primary CTA
 *   - /api/onboarding/status?detail=1 for client-side consumers
 *
 * The 4 setup signals are checked in priority order: each gates the
 * next ("you can't run an assessment until you have an org"), so the
 * `nextAction` field maps cleanly to a single primary CTA on the UI.
 *
 * Single round-trip: 4 parallel queries, each bounded by take: 1 or
 * count. Total query time ~30-60ms even on cold cache.
 */

export type OnboardingNextAction =
  | "set_up_organization"
  | "add_spacecraft"
  | "run_assessment"
  | "open_first_item"
  | "all_done";

export interface OnboardingSetupState {
  hasOrganization: boolean;
  hasSpacecraft: boolean;
  spacecraftCount: number;
  hasAnyAssessment: boolean;
  hasComplianceItems: boolean;
  completedSteps: number;
  totalSteps: number;
  nextAction: OnboardingNextAction;
}

export async function getOnboardingSetupState(
  userId: string,
): Promise<OnboardingSetupState> {
  // First: do we have an org? Many later checks depend on the orgId.
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });
  const orgId = member?.organizationId ?? null;
  const hasOrganization = orgId !== null;

  // Without an org, all downstream checks return false — short-circuit
  // to avoid wasted queries.
  if (!hasOrganization) {
    return {
      hasOrganization: false,
      hasSpacecraft: false,
      spacecraftCount: 0,
      hasAnyAssessment: false,
      hasComplianceItems: false,
      completedSteps: 0,
      totalSteps: 4,
      nextAction: "set_up_organization",
    };
  }

  // Parallel: spacecraft count + assessment-existence + items-existence.
  const [spacecraftCount, anyAssessmentRows, anyItemRows] = await Promise.all([
    prisma.spacecraft.count({
      where: { organizationId: orgId! },
    }),
    Promise.all([
      prisma.debrisAssessment.findFirst({
        where: { userId },
        select: { id: true },
      }),
      prisma.nIS2Assessment.findFirst({
        where: { userId },
        select: { id: true },
      }),
      prisma.cybersecurityAssessment.findFirst({
        where: { userId },
        select: { id: true },
      }),
    ]),
    Promise.all([
      prisma.debrisRequirementStatus.findFirst({
        where: { assessment: { userId } },
        select: { id: true },
      }),
      prisma.nIS2RequirementStatus.findFirst({
        where: { assessment: { userId } },
        select: { id: true },
      }),
    ]),
  ]);

  const hasSpacecraft = spacecraftCount > 0;
  const hasAnyAssessment = anyAssessmentRows.some((r) => r !== null);
  const hasComplianceItems = anyItemRows.some((r) => r !== null);

  const completedSteps = [
    hasOrganization,
    hasSpacecraft,
    hasAnyAssessment,
    hasComplianceItems,
  ].filter(Boolean).length;

  // Priority-ordered next action — first unfinished step wins.
  // hasComplianceItems implies hasAnyAssessment, so we treat them as
  // a single "assessment progress" step in the heuristic.
  const nextAction: OnboardingNextAction = !hasOrganization
    ? "set_up_organization"
    : !hasSpacecraft
      ? "add_spacecraft"
      : !hasAnyAssessment
        ? "run_assessment"
        : !hasComplianceItems
          ? "run_assessment"
          : "all_done";

  return {
    hasOrganization,
    hasSpacecraft,
    spacecraftCount,
    hasAnyAssessment,
    hasComplianceItems,
    completedSteps,
    totalSteps: 4,
    nextAction,
  };
}
