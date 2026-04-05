import { logger } from "@/lib/logger";
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

    // Parse optional query filters and pagination
    const { searchParams } = new URL(request.url);
    const hazardType = searchParams.get("hazardType") ?? undefined;
    const severity = searchParams.get("severity") ?? undefined;
    const acceptanceStatus = searchParams.get("acceptanceStatus") ?? undefined;
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1,
    );
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50),
      100,
    );
    const skip = (page - 1) * limit;

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

    const [entries, totalCount] = await Promise.all([
      prisma.hazardEntry.findMany({
        where,
        include: {
          mitigations: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ hazardId: "asc" }, { createdAt: "asc" }],
        skip,
        take: limit,
      }),
      prisma.hazardEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    logger.error("[missions/[missionId]/hazards] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
