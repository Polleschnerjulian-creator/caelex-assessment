import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/onboarding/status
 *
 * Two response shapes:
 *
 *   { onboardingCompleted: boolean }
 *
 *     The legacy gate the dashboard layout reads to decide whether
 *     to redirect to /onboarding. Backwards-compatible.
 *
 *   { onboardingCompleted, setup: { hasOrganization, hasSpacecraft,
 *     hasAnyAssessment, hasComplianceItems, completedSteps,
 *     totalSteps, nextAction } }
 *
 *     The granular state the V2Sidebar setup-progress badge and the
 *     Today smart-empty-state branch on. Only computed when the
 *     caller passes `?detail=1`, so the legacy callers don't pay
 *     for the extra DB queries.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const wantsDetail = searchParams.get("detail") === "1";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompleted: true,
        organizationMemberships: {
          select: { organizationId: true },
          take: 1,
        },
      },
    });

    // Auto-complete onboarding for existing users who already have an org.
    // (Legacy migration: pre-onboarding-flow accounts.)
    if (
      user &&
      !user.onboardingCompleted &&
      user.organizationMemberships.length > 0
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
      });
    }

    const onboardingCompleted =
      user?.onboardingCompleted ||
      (user?.organizationMemberships.length ?? 0) > 0;

    if (!wantsDetail) {
      return NextResponse.json({
        onboardingCompleted,
      });
    }

    // ── Detail mode: compute granular setup state ──
    const orgId = user?.organizationMemberships[0]?.organizationId ?? null;

    // 4 quick parallel checks. All bounded by `take: 1` / `count` so
    // they're cheap.
    const [spacecraftCount, anyAssessment, anyDebrisItem, anyNis2Item] =
      await Promise.all([
        orgId
          ? prisma.spacecraft.count({
              where: { organizationId: orgId },
            })
          : Promise.resolve(0),
        // Any of the 8 regulation-assessment models having a row for
        // this user counts as "started an assessment".
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
        ]).then((results) => results.some((r) => r !== null)),
        prisma.debrisRequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
        prisma.nIS2RequirementStatus.findFirst({
          where: { assessment: { userId } },
          select: { id: true },
        }),
      ]);

    const hasOrganization = orgId !== null;
    const hasSpacecraft = spacecraftCount > 0;
    const hasAnyAssessment = anyAssessment;
    const hasComplianceItems = anyDebrisItem !== null || anyNis2Item !== null;

    const completedSteps = [
      hasOrganization,
      hasSpacecraft,
      hasAnyAssessment,
      hasComplianceItems,
    ].filter(Boolean).length;
    const totalSteps = 4;

    // Next-action heuristic — drives the smart Today empty state.
    let nextAction:
      | "set_up_organization"
      | "add_spacecraft"
      | "run_assessment"
      | "open_first_item"
      | "all_done" = "all_done";
    if (!hasOrganization) nextAction = "set_up_organization";
    else if (!hasSpacecraft) nextAction = "add_spacecraft";
    else if (!hasAnyAssessment) nextAction = "run_assessment";
    else if (!hasComplianceItems) nextAction = "run_assessment";

    return NextResponse.json({
      onboardingCompleted,
      setup: {
        hasOrganization,
        hasSpacecraft,
        spacecraftCount,
        hasAnyAssessment,
        hasComplianceItems,
        completedSteps,
        totalSteps,
        nextAction,
      },
    });
  } catch (error) {
    logger.error("[onboarding/status]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
