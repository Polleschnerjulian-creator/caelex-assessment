/**
 * Network Engagements API
 * GET - List stakeholder engagements
 * POST - Create a new stakeholder engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import {
  createEngagement,
  getEngagements,
} from "@/lib/services/stakeholder-engagement";
import { parsePaginationLimit } from "@/lib/validations";
import type { StakeholderType, EngagementStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

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
    const limit = parsePaginationLimit(searchParams.get("limit"));

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
    logger.error("Failed to fetch engagements", error);
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

    const schema = z.object({
      organizationId: z.string().min(1),
      type: z.enum([
        "LEGAL_COUNSEL",
        "INSURER",
        "AUDITOR",
        "SUPPLIER",
        "NCA",
        "CONSULTANT",
        "LAUNCH_PROVIDER",
      ]),
      companyName: z.string().min(1),
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      jurisdiction: z.string().optional(),
      licenseNumber: z.string().optional(),
      website: z.string().optional(),
      scope: z.string().min(1),
      contractRef: z.string().optional(),
      retainerStart: z.string().optional(),
      retainerEnd: z.string().optional(),
      ipAllowlist: z.array(z.string()).optional(),
      mfaRequired: z.boolean().optional(),
      tokenExpiryDays: z.number().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, ...engagementData } = parsed.data;

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
    logger.error("Failed to create engagement", error);
    return NextResponse.json(
      { error: "Failed to create engagement" },
      { status: 500 },
    );
  }
}
