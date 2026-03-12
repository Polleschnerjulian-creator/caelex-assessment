import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";

// ─── Route params type ───

type RouteParams = { params: Promise<{ missionId: string }> };

// ─── GET: List all hazards for a spacecraft (missionId = spacecraftId) ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { missionId } = await params;
    const spacecraftId = missionId;

    // Verify spacecraft belongs to the user's organization
    const spacecraft = await prisma.spacecraft.findFirst({
      where: { id: spacecraftId, organizationId: orgId },
      select: { id: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Spacecraft not found in your organization" },
        { status: 403 },
      );
    }

    // Parse optional query filters
    const { searchParams } = new URL(request.url);
    const hazardType = searchParams.get("hazardType") ?? undefined;
    const severity = searchParams.get("severity") ?? undefined;
    const acceptanceStatus = searchParams.get("acceptanceStatus") ?? undefined;

    // Build where clause with optional filters
    const where: Record<string, unknown> = {
      spacecraftId,
      organizationId: orgId,
    };

    if (hazardType) {
      // Validate the hazardType enum value
      const validTypes = [
        "COLLISION",
        "REENTRY",
        "EXPLOSION",
        "CONTROL_LOSS",
        "TOXICITY",
        "DEBRIS_GENERATION",
        "CYBER",
      ];
      if (!validTypes.includes(hazardType)) {
        return NextResponse.json(
          { error: "Invalid hazardType filter" },
          { status: 400 },
        );
      }
      where.hazardType = hazardType;
    }

    if (severity) {
      const validSeverities = [
        "CATASTROPHIC",
        "CRITICAL",
        "MARGINAL",
        "NEGLIGIBLE",
      ];
      if (!validSeverities.includes(severity)) {
        return NextResponse.json(
          { error: "Invalid severity filter" },
          { status: 400 },
        );
      }
      where.severity = severity;
    }

    if (acceptanceStatus) {
      const validStatuses = ["PENDING", "ACCEPTED", "REJECTED"];
      if (!validStatuses.includes(acceptanceStatus)) {
        return NextResponse.json(
          { error: "Invalid acceptanceStatus filter" },
          { status: 400 },
        );
      }
      where.acceptanceStatus = acceptanceStatus;
    }

    const entries = await prisma.hazardEntry.findMany({
      where,
      include: {
        mitigations: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ hazardId: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[missions/[missionId]/hazards] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
