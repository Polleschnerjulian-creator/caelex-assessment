/**
 * Assure IRS Compute API
 * POST: Compute Investment Readiness Score. Call computeAndSaveIRS. Return result.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { computeAndSaveIRS } from "@/lib/assure/irs-engine.server";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const organizationId = membership.organizationId;

    const result = await computeAndSaveIRS(organizationId);

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_irs_computed",
      entityType: "assure_irs",
      entityId: organizationId,
      metadata: {
        overallScore: result.overallScore,
        grade: result.grade,
        organizationName: membership.organization.name,
      },
      organizationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Assure IRS compute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
