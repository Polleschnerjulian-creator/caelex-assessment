import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's organization membership (most recent / primary)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "desc" },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { organization } = membership;
    const subscription = organization.subscription;

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
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
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
