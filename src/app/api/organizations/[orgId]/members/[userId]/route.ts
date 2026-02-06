/**
 * Organization Member Detail API
 * PATCH: Update member role
 * DELETE: Remove member
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  updateMemberRole,
  removeMember,
  getUserRole,
  hasPermission,
  getDefaultPermissionsForRole,
} from "@/lib/services/organization-service";
import type { OrganizationRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ orgId: string; userId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId: targetUserId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Check permission
    const permissions = getDefaultPermissionsForRole(userRole);
    if (!hasPermission(permissions, "members:role")) {
      return NextResponse.json(
        { error: "You don't have permission to change member roles" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    // Validate role
    const validRoles: OrganizationRole[] = [
      "OWNER",
      "ADMIN",
      "MANAGER",
      "MEMBER",
      "VIEWER",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Cannot change to owner unless you're an owner
    if (role === "OWNER" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Only owners can promote to owner" },
        { status: 403 },
      );
    }

    // Cannot demote yourself if you're the only owner
    if (
      targetUserId === session.user.id &&
      userRole === "OWNER" &&
      role !== "OWNER"
    ) {
      return NextResponse.json(
        { error: "You cannot demote yourself. Transfer ownership first." },
        { status: 400 },
      );
    }

    const updated = await updateMemberRole(
      orgId,
      targetUserId,
      role,
      session.user.id,
    );

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
      },
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update member role") },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId: targetUserId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Users can remove themselves, otherwise need permission
    if (targetUserId !== session.user.id) {
      const permissions = getDefaultPermissionsForRole(userRole);
      if (!hasPermission(permissions, "members:remove")) {
        return NextResponse.json(
          { error: "You don't have permission to remove members" },
          { status: 403 },
        );
      }
    }

    await removeMember(orgId, targetUserId, session.user.id);

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to remove member") },
      { status: 500 },
    );
  }
}
