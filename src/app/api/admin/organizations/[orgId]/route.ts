/**
 * Admin: Single Organization Management API
 *
 * GET    /api/admin/organizations/:orgId — Get organization details
 * PATCH  /api/admin/organizations/:orgId — Update plan or limits
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import type { OrganizationPlan } from "@prisma/client";

const VALID_PLANS: OrganizationPlan[] = [
  "FREE",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

const PLAN_LIMITS: Record<
  OrganizationPlan,
  { maxUsers: number; maxSpacecraft: number }
> = {
  FREE: { maxUsers: 1, maxSpacecraft: 1 },
  STARTER: { maxUsers: 3, maxSpacecraft: 5 },
  PROFESSIONAL: { maxUsers: 10, maxSpacecraft: 25 },
  ENTERPRISE: { maxUsers: 999, maxSpacecraft: 999 },
};

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { orgId } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            spacecraft: true,
          },
        },
        members: {
          select: {
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        subscription: {
          select: {
            status: true,
            plan: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ organization });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    console.error("Admin: Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { orgId } = await params;
    const body = await request.json();
    const { plan, maxUsers, maxSpacecraft, reason } = body;

    // Get current org state for audit
    const previousOrg = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        plan: true,
        maxUsers: true,
        maxSpacecraft: true,
      },
    });

    if (!previousOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: {
      plan?: OrganizationPlan;
      maxUsers?: number;
      maxSpacecraft?: number;
    } = {};
    let description = "";

    if (plan !== undefined) {
      if (!VALID_PLANS.includes(plan as OrganizationPlan)) {
        return NextResponse.json(
          {
            error: `Invalid plan. Must be one of: ${VALID_PLANS.join(", ")}`,
          },
          { status: 400 },
        );
      }
      updateData.plan = plan as OrganizationPlan;
      // Auto-update limits based on plan
      const limits = PLAN_LIMITS[plan as OrganizationPlan];
      updateData.maxUsers = limits.maxUsers;
      updateData.maxSpacecraft = limits.maxSpacecraft;
      description = `Changed plan from ${previousOrg.plan} to ${plan} for ${previousOrg.name}`;
    } else {
      // Manual limit overrides
      if (typeof maxUsers === "number" && maxUsers > 0) {
        updateData.maxUsers = maxUsers;
      }
      if (typeof maxSpacecraft === "number" && maxSpacecraft > 0) {
        updateData.maxSpacecraft = maxSpacecraft;
      }
      description = `Updated limits for ${previousOrg.name}`;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Must provide plan or limits to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        maxUsers: true,
        maxSpacecraft: true,
      },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: plan
        ? "organization_plan_changed"
        : "organization_limits_changed",
      entityType: "organization",
      entityId: orgId,
      previousValue: {
        plan: previousOrg.plan,
        maxUsers: previousOrg.maxUsers,
        maxSpacecraft: previousOrg.maxSpacecraft,
      },
      newValue: updateData,
      description,
      metadata: reason ? { reason } : undefined,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      organization: updated,
      message: "Organization updated successfully",
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    console.error("Admin: Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
