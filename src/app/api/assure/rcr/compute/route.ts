/**
 * Assure RCR Compute API
 * POST: Compute a new Regulatory Credit Rating for the user's organization
 *
 * Requires MANAGER+ role. Calls the RCR engine to compute scores,
 * stores the result, and returns the full RCR result.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { computeAndSaveRCR } from "@/lib/rcr-engine.server";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function POST(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Role check: MANAGER+
    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const organizationId = membership.organizationId;

    // Compute and save RCR
    const result = await computeAndSaveRCR(organizationId);

    // Audit log
    await logAuditEvent({
      userId: session.user.id,
      action: "rcr_computed",
      entityType: "rcr_rating",
      entityId: organizationId,
      metadata: {
        grade: result.grade,
        numericScore: result.numericScore,
        outlook: result.outlook,
        actionType: result.actionType,
        organizationName: membership.organization.name,
      },
      organizationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("RCR compute API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
