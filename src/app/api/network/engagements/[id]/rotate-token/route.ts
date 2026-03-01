/**
 * Engagement Token Rotation API
 * POST - Rotate the access token for a stakeholder engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { rotateToken } from "@/lib/services/stakeholder-engagement";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const schema = z.object({
      organizationId: z.string().min(1),
      tokenExpiryDays: z.number().positive().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, tokenExpiryDays } = parsed.data;

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

    const result = await rotateToken(
      id,
      organizationId,
      session.user.id,
      tokenExpiryDays || 90,
    );

    return NextResponse.json({
      success: true,
      engagement: {
        id: result.engagement.id,
        companyName: result.engagement.companyName,
        tokenExpiresAt: result.engagement.tokenExpiresAt,
      },
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Failed to rotate token:", error);
    return NextResponse.json(
      { error: "Failed to rotate token" },
      { status: 500 },
    );
  }
}
