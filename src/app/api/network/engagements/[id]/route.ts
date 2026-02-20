/**
 * Individual Engagement API
 * GET - Get engagement detail with data rooms, attestations, and counts
 * PATCH - Partial update of engagement
 * DELETE - Revoke engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import {
  getEngagement,
  updateEngagement,
  revokeEngagement,
} from "@/lib/services/stakeholder-engagement";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: Get Engagement Detail ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const engagement = await getEngagement(id, organizationId);

    if (!engagement) {
      return NextResponse.json(
        { error: "Engagement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ engagement });
  } catch (error) {
    console.error("Failed to fetch engagement:", error);
    return NextResponse.json(
      { error: "Failed to fetch engagement" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update Engagement ───

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { organizationId, ...updateData } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const engagement = await updateEngagement(
      id,
      organizationId,
      {
        companyName: updateData.companyName,
        contactName: updateData.contactName,
        contactEmail: updateData.contactEmail,
        contactPhone: updateData.contactPhone,
        jurisdiction: updateData.jurisdiction,
        licenseNumber: updateData.licenseNumber,
        website: updateData.website,
        scope: updateData.scope,
        contractRef: updateData.contractRef,
        retainerStart: updateData.retainerStart
          ? new Date(updateData.retainerStart)
          : undefined,
        retainerEnd: updateData.retainerEnd
          ? new Date(updateData.retainerEnd)
          : undefined,
        status: updateData.status,
        ipAllowlist: updateData.ipAllowlist,
        mfaRequired: updateData.mfaRequired,
      },
      session.user.id,
    );

    return NextResponse.json({ success: true, engagement });
  } catch (error) {
    console.error("Failed to update engagement:", error);
    return NextResponse.json(
      { error: "Failed to update engagement" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Revoke Engagement ───

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const engagement = await revokeEngagement(
      id,
      organizationId,
      session.user.id,
    );

    return NextResponse.json({ success: true, engagement });
  } catch (error) {
    console.error("Failed to revoke engagement:", error);
    return NextResponse.json(
      { error: "Failed to revoke engagement" },
      { status: 500 },
    );
  }
}
