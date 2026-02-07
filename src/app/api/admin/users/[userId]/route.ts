/**
 * Admin: Single User Management API
 *
 * PATCH /api/admin/users/:userId — Update user role or active status
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

const VALID_ROLES = ["user", "admin", "auditor"];

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        organization: true,
        operatorType: true,
        establishmentCountry: true,
        isThirdCountry: true,
        createdAt: true,
        updatedAt: true,
        organizationMemberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                maxUsers: true,
                maxSpacecraft: true,
              },
            },
          },
        },
        _count: {
          select: {
            articleStatuses: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
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
    console.error("Admin: Error fetching user:", error);
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

    const { userId } = await params;
    const body = await request.json();
    const { role, isActive } = body;

    // Get current user state for audit
    const previousUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true, email: true },
    });

    if (!previousUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build update data
    const updateData: { role?: string; isActive?: boolean } = {};
    let auditAction = "";
    let description = "";

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
          { status: 400 },
        );
      }
      updateData.role = role;
      auditAction = "user_role_changed";
      description = `Changed role from ${previousUser.role} to ${role} for ${previousUser.email}`;
    }

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
      auditAction = isActive ? "user_activated" : "user_deactivated";
      description = `${isActive ? "Activated" : "Deactivated"} user ${previousUser.email}`;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Must provide either role or isActive" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      data: updateData,
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: auditAction,
      entityType: "user",
      entityId: userId,
      previousValue: {
        role: previousUser.role,
        isActive: previousUser.isActive,
      },
      newValue: updateData,
      description,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      user: updated,
      message: "User updated successfully",
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
    console.error("Admin: Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
