/**
 * Network Engagements API
 * GET - List stakeholder engagements
 * POST - Create a new stakeholder engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import {
  createEngagement,
  getEngagements,
} from "@/lib/services/stakeholder-engagement";
import type { StakeholderType, EngagementStatus } from "@prisma/client";

// ─── GET: List Engagements ───

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const type = searchParams.get("type") as StakeholderType | null;
    const status = searchParams.get("status") as EngagementStatus | null;
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

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

    const result = await getEngagements(
      organizationId,
      {
        type: type || undefined,
        status: status || undefined,
        search: search || undefined,
      },
      { page, limit },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch engagements:", error);
    return NextResponse.json(
      { error: "Failed to fetch engagements" },
      { status: 500 },
    );
  }
}

// ─── POST: Create Engagement ───

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, ...engagementData } = body;

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

    // Validate required fields
    if (
      !engagementData.type ||
      !engagementData.companyName ||
      !engagementData.contactName ||
      !engagementData.contactEmail ||
      !engagementData.scope
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: type, companyName, contactName, contactEmail, scope",
        },
        { status: 400 },
      );
    }

    const result = await createEngagement(
      {
        organizationId,
        type: engagementData.type,
        companyName: engagementData.companyName,
        contactName: engagementData.contactName,
        contactEmail: engagementData.contactEmail,
        contactPhone: engagementData.contactPhone,
        jurisdiction: engagementData.jurisdiction,
        licenseNumber: engagementData.licenseNumber,
        website: engagementData.website,
        scope: engagementData.scope,
        contractRef: engagementData.contractRef,
        retainerStart: engagementData.retainerStart
          ? new Date(engagementData.retainerStart)
          : undefined,
        retainerEnd: engagementData.retainerEnd
          ? new Date(engagementData.retainerEnd)
          : undefined,
        ipAllowlist: engagementData.ipAllowlist,
        mfaRequired: engagementData.mfaRequired,
        tokenExpiryDays: engagementData.tokenExpiryDays,
      },
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      engagement: result.engagement,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Failed to create engagement:", error);
    return NextResponse.json(
      { error: "Failed to create engagement" },
      { status: 500 },
    );
  }
}
