/**
 * Engagement Resend API
 * POST - Resend engagement invitation (returns current access token info)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import {
  getEngagement,
  rotateToken,
} from "@/lib/services/stakeholder-engagement";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
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

    // Rate limit: sensitive tier for resend (rotates token + sends email)
    const rl = await checkRateLimit(
      "sensitive",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

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

    // Rotate token so the stakeholder gets a fresh one
    const { accessToken } = await rotateToken(
      id,
      organizationId,
      session.user.id,
    );

    // Send the invitation email
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "";
    try {
      await sendEmail({
        to: engagement.contactEmail,
        subject: `Caelex — Einladung zum Compliance Network`,
        html: `
          <p>Hallo ${engagement.contactName},</p>
          <p>${engagement.companyName} hat Sie zum Caelex Compliance Network eingeladen.</p>
          <p>Ihr Zugangscode: <strong>${accessToken}</strong></p>
          <p>Portal öffnen: <a href="${baseUrl}/stakeholder?token=${accessToken}">${baseUrl}/stakeholder</a></p>
        `,
      });
    } catch (err) {
      logger.warn(
        "Failed to send invitation email",
        err as Record<string, unknown>,
      );
      // Don't fail the request — email is best-effort
    }

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
