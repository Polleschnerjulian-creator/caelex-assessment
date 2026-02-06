/**
 * Organization Detail API
 * GET: Get organization details
 * PATCH: Update organization
 * DELETE: Delete organization (soft delete)
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getUserRole,
  hasPermission,
  getDefaultPermissionsForRole,
} from "@/lib/services/organization-service";
import { getSafeErrorMessage } from "@/lib/validations";

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

    const organization = await getOrganization(orgId);

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Check read permission
    const permissions = getDefaultPermissionsForRole(userRole);
    if (!hasPermission(permissions, "org:read")) {
      return NextResponse.json(
        { error: "You don't have permission to view this organization" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logoUrl,
        primaryColor: organization.primaryColor,
        timezone: organization.timezone,
        defaultLanguage: organization.defaultLanguage,
        plan: organization.plan,
        planExpiresAt: organization.planExpiresAt,
        maxUsers: organization.maxUsers,
        maxSpacecraft: organization.maxSpacecraft,
        billingEmail: organization.billingEmail,
        vatNumber: organization.vatNumber,
        billingAddress: organization.billingAddress,
        isActive: organization.isActive,
        createdAt: organization.createdAt,
        members: organization.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        _count: organization._count,
      },
      userRole,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
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

    const { orgId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Check update permission
    const permissions = getDefaultPermissionsForRole(userRole);
    if (!hasPermission(permissions, "org:update")) {
      return NextResponse.json(
        { error: "You don't have permission to update this organization" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name,
      logoUrl,
      primaryColor,
      timezone,
      defaultLanguage,
      billingEmail,
      vatNumber,
      billingAddress,
    } = body;

    const updated = await updateOrganization(orgId, session.user.id, {
      name,
      logoUrl,
      primaryColor,
      timezone,
      defaultLanguage,
      billingEmail,
      vatNumber,
      billingAddress,
    });

    return NextResponse.json({
      organization: updated,
      message: "Organization updated successfully",
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update organization") },
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

    const { orgId } = await params;
    const userRole = await getUserRole(orgId, session.user.id);

    if (!userRole) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Only owners can delete
    if (userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Only organization owners can delete the organization" },
        { status: 403 },
      );
    }

    await deleteOrganization(orgId, session.user.id);

    return NextResponse.json({
      message: "Organization deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to delete organization") },
      { status: 500 },
    );
  }
}
