/**
 * SSO Test API
 * POST - Test SSO configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testSSOConnection } from "@/lib/services/sso-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user has admin access to this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const result = await testSSOConnection(organizationId, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error testing SSO", error);
    return NextResponse.json(
      { error: "Failed to test SSO configuration" },
      { status: 500 },
    );
  }
}
