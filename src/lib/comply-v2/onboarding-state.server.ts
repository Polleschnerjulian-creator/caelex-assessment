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
  | "create_first_mission"
  | "add_spacecraft"
  | "run_assessment"
  | "open_first_item"
  | "all_done";

export interface OnboardingSetupState {
  hasOrganization: boolean;
  /** Sprint M-Onboarding: Mission is now first-class. A user has set
   *  up the org's "first asset" once they've either created a Mission
   *  OR registered a Spacecraft (the lazy backfill auto-wraps legacy
   *  Spacecraft into Missions, so any of the two satisfies the gate). */
  hasMission: boolean;
  missionCount: number;
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
      hasMission: false,
      missionCount: 0,
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
  // Sprint E fix: was checking only 3 of 8 assessment tables and
  // 2 of 8 status tables. Users who only ran a UK_SPACE / SPECTRUM
  // / EXPORT_CONTROL / CRA / US_REGULATORY assessment got "run
  // assessment" prompted forever. Now checks all 8 of each.
  const [missionCount, spacecraftCount, anyAssessmentRows, anyItemRows] =
    await Promise.all([
      // Sprint M-Onboarding: count first-class Missions in the org.
      prisma.mission.count({
        where: { organizationId: orgId! },
      }),
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
        prisma.cRAAssessment.findFirst({
          where: { userId },
          select: { id: true },
        }),
        prisma.ukSpaceAssessment.findFirst({
          where: { userId },
          select: { id: true },
        }),
        prisma.usRegulatoryAssessment.findFirst({
          where: { userId },
          select: { id: true },
        }),
        prisma.exportControlAssessment.findFirst({
          where: { userId },
          select: { id: true },
        }),
        prisma.spectrumAssessment.findFirst({
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
        prisma.cybersecurityRequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
        prisma.cRARequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
        prisma.ukRequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
        prisma.usRequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
        prisma.exportControlRequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
        prisma.spectrumRequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
      ]),
    ]);

  const hasMission = missionCount > 0;
  const hasSpacecraft = spacecraftCount > 0;
  // First-asset gate: either Mission OR Spacecraft satisfies it. The
  // lazy backfill in getMissionsForUser() auto-wraps legacy Spacecraft
  // into Missions on first list-fetch, so a Spacecraft-only org will
  // become a Mission-having org transparently.
  const hasFirstAsset = hasMission || hasSpacecraft;
  const hasAnyAssessment = anyAssessmentRows.some((r) => r !== null);
  const hasComplianceItems = anyItemRows.some((r) => r !== null);

  const completedSteps = [
    hasOrganization,
    hasFirstAsset,
    hasAnyAssessment,
    hasComplianceItems,
  ].filter(Boolean).length;

  // Priority-ordered next action — first unfinished step wins. After
  // the Mission-domain refactor we prefer pointing new orgs to
  // /dashboard/missions/new (creates a Mission) rather than the
  // Spacecraft registry. If the org already has a Spacecraft but no
  // Mission yet, we still recognize that as "first asset done" thanks
  // to the auto-backfill.
  const nextAction: OnboardingNextAction = !hasOrganization
    ? "set_up_organization"
    : !hasFirstAsset
      ? "create_first_mission"
      : !hasAnyAssessment
        ? "run_assessment"
        : !hasComplianceItems
          ? "run_assessment"
          : "all_done";

  return {
    hasOrganization,
    hasMission,
    missionCount,
    hasSpacecraft,
    spacecraftCount,
    hasAnyAssessment,
    hasComplianceItems,
    completedSteps,
    totalSteps: 4,
    nextAction,
  };
}
