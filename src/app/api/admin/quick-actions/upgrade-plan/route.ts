/**
 * Admin: Quick Plan Upgrade API
 *
 * POST /api/admin/quick-actions/upgrade-plan — Upgrade a user's org plan by email
 *
 * This is the primary admin action: find user by email, find their org, upgrade the plan.
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

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const body = await request.json();
    const { email, plan, reason } = body;

    // Validate inputs
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!plan || !VALID_PLANS.includes(plan as OrganizationPlan)) {
      return NextResponse.json(
        {
          error: `Invalid plan. Must be one of: ${VALID_PLANS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        organizationMemberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                plan: true,
                maxUsers: true,
                maxSpacecraft: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${email}` },
        { status: 404 },
      );
    }

    const membership = user.organizationMemberships[0];
    if (!membership) {
      return NextResponse.json(
        {
          error: `User ${email} has no organization. They need to create or join an organization first.`,
        },
        { status: 400 },
      );
    }

    const org = membership.organization;
    const previousPlan = org.plan;
    const limits = PLAN_LIMITS[plan as OrganizationPlan];

    // Update the organization plan
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: plan as OrganizationPlan,
        maxUsers: limits.maxUsers,
        maxSpacecraft: limits.maxSpacecraft,
      },
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
      action: "organization_plan_changed",
      entityType: "organization",
      entityId: org.id,
      previousValue: {
        plan: previousPlan,
        maxUsers: org.maxUsers,
        maxSpacecraft: org.maxSpacecraft,
      },
      newValue: {
        plan,
        maxUsers: limits.maxUsers,
        maxSpacecraft: limits.maxSpacecraft,
      },
      description: `Quick upgrade: Changed plan from ${previousPlan} to ${plan} for ${org.name} (triggered by email: ${email})`,
      metadata: reason
        ? { reason, triggeredByEmail: email }
        : { triggeredByEmail: email },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      organization: updated,
      user: { id: user.id, name: user.name, email: user.email },
      previousPlan,
      message: `Successfully upgraded ${email}'s organization "${updated.name}" to ${plan}`,
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
    console.error("Admin: Error upgrading plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
