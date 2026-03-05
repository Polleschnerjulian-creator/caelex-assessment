/**
 * Organization Member Detail API
 * PATCH: Update member role
 * DELETE: Remove member
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getSafeErrorMessage } from "@/lib/validations";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  updateMemberRole,
  removeMember,
  getUserRole,
  hasPermission,
  getDefaultPermissionsForRole,
} from "@/lib/services/organization-service";
import { logger } from "@/lib/logger";

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

    const updateRoleSchema = z.object({
      role: z.enum(["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"], {
        message: "Role is required",
      }),
    });

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { role } = parsed.data;

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

    // Audit log role change
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "member_role_changed",
      entityType: "organization_member",
      entityId: targetUserId,
      previousValue: { role: userRole },
      newValue: { role, organizationId: orgId },
      description: `Changed member role to ${role} in organization ${orgId}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
      },
      message: "Member role updated successfully",
    });
  } catch (error) {
    logger.error("Error updating member role", error);
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

    // Audit log member removal
    const { ipAddress: delIp, userAgent: delUa } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "member_removed",
      entityType: "organization_member",
      entityId: targetUserId,
      previousValue: { organizationId: orgId, removedUserId: targetUserId },
      description: `Removed member ${targetUserId} from organization ${orgId}`,
      ipAddress: delIp,
      userAgent: delUa,
    });

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    logger.error("Error removing member", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to remove member") },
      { status: 500 },
    );
  }
}
