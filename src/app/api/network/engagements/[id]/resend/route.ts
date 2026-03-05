/**
 * Engagement Resend API
 * POST - Resend engagement invitation (returns current access token info)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { getEngagement } from "@/lib/services/stakeholder-engagement";
import { logger } from "@/lib/logger";

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
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId } = parsed.data;

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

    const engagement = await getEngagement(id, organizationId);

    if (!engagement) {
      return NextResponse.json(
        { error: "Engagement not found" },
        { status: 404 },
      );
    }

    if (engagement.isRevoked) {
      return NextResponse.json(
        { error: "Cannot resend invitation for a revoked engagement" },
        { status: 400 },
      );
    }

    // In a real implementation, this would trigger an email to the stakeholder.
    // For now, return the current access token info.
    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully",
      engagement: {
        id: engagement.id,
        companyName: engagement.companyName,
        contactEmail: engagement.contactEmail,
        contactName: engagement.contactName,
        status: engagement.status,
        tokenExpiresAt: engagement.tokenExpiresAt,
      },
    });
  } catch (error) {
    logger.error("Failed to resend engagement invitation", error);
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 },
    );
  }
}
