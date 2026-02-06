/**
 * Organization Members API
 * GET: List organization members
 * POST: Add a member directly (requires user ID)
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import {
  addMember,
  getUserRole,
  hasPermission,
  getDefaultPermissionsForRole,
} from "@/lib/services/organization-service";
import type { OrganizationRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Check permission
    const permissions = getDefaultPermissionsForRole(userRole);
    if (!hasPermission(permissions, "members:read")) {
      return NextResponse.json(
        { error: "You don't have permission to view members" },
        { status: 403 },
      );
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        permissions: m.permissions,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy,
      })),
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Check permission
    const permissions = getDefaultPermissionsForRole(userRole);
    if (!hasPermission(permissions, "members:invite")) {
      return NextResponse.json(
        { error: "You don't have permission to add members" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, role = "MEMBER" } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
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

    // Cannot add someone as owner unless you're an owner
    if (role === "OWNER" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Only owners can add other owners" },
        { status: 403 },
      );
    }

    const member = await addMember(orgId, userId, role, session.user.id);

    return NextResponse.json({
      member: {
        id: member.id,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
      },
      message: "Member added successfully",
    });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to add member") },
      { status: 500 },
    );
  }
}
