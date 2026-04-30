import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isSuperAdmin } from "@/lib/super-admin";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(session.user.email);

    // Find user's organization membership (most recent / primary)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "desc" },
      include: {
        organization: {
          include: {
            subscription: {
              select: {
                id: true,
                plan: true,
                status: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                cancelAtPeriodEnd: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      // Super-admins without an org membership still need every module
      // unlocked so they can debug any customer flow. Return a synthetic
      // ENTERPRISE-tier org so OrganizationProvider.hasModuleAccess()
      // resolves true for every module.
      if (superAdmin) {
        return NextResponse.json({
          organization: {
            id: "__super_admin__",
            name: "Caelex Platform Operations",
            slug: "__super_admin__",
            plan: "ENTERPRISE",
            maxUsers: 9999,
            maxSpacecraft: 9999,
            isActive: true,
          },
          subscription: null,
          role: "OWNER",
          permissions: [],
        });
      }
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { organization } = membership;
    const subscription = organization.subscription;
    // Super-admin override — overlay ENTERPRISE on top of whatever the
    // user's own org happens to be, so module-gating in the client
    // unlocks everything regardless of their personal plan tier.
    const effectivePlan = superAdmin ? "ENTERPRISE" : organization.plan;

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: effectivePlan,
        maxUsers: organization.maxUsers,
        maxSpacecraft: organization.maxSpacecraft,
        isActive: organization.isActive,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
      role: membership.role,
      permissions: membership.permissions,
    });
  } catch (error) {
    logger.error("Error fetching organization", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
