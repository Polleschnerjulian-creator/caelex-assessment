/**
 * Assure Risk Auto-Populate API
 * POST: Call autoPopulateRisks engine. Return count of risks created.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { autoPopulateRisks } from "@/lib/assure/risk-engine.server";

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

    const profile = await prisma.assureCompanyProfile.findUnique({
      where: { organizationId },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "Company profile not found. Create a profile first." },
        { status: 404 },
      );
    }

    const result = await autoPopulateRisks(organizationId, profile.id);

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_risks_auto_populated",
      entityType: "assure_risk",
      entityId: organizationId,
      metadata: { risksCreated: result.created },
      organizationId,
    });

    return NextResponse.json({
      created: result.created,
      skipped: result.skipped,
      total: result.total,
    });
  } catch (error) {
    console.error("Assure risk auto-populate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
