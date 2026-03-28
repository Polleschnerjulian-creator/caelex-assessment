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
import { z } from "zod";

// ─── Severity score mapping ───

const SEVERITY_SCORES: Record<string, number> = {
  CATASTROPHIC: 4,
  CRITICAL: 3,
  MARGINAL: 2,
  NEGLIGIBLE: 1,
};

// ─── Validation ───

const updateHazardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  severity: z
    .enum(["CATASTROPHIC", "CRITICAL", "MARGINAL", "NEGLIGIBLE"])
    .optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  mitigationStatus: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
  residualRisk: z.string().nullable().optional(),
  regulatoryRefs: z.array(z.string()).optional(),
  fmecaNotes: z.string().nullable().optional(),
});

// ─── Route params type ───

type RouteParams = { params: Promise<{ hazardId: string }> };

// ─── GET: Fetch single HazardEntry by id ───

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

    const { hazardId } = await params;

    const entry = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      include: {
        mitigations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ entry });
  } catch (err) {
    logger.error("[hazards/[hazardId]] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT: Update HazardEntry ───

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { hazardId } = await params;

    // Verify the hazard belongs to the user's organization
    const existing = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      select: { id: true, severity: true, likelihood: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateHazardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.likelihood !== undefined) updateData.likelihood = data.likelihood;
    if (data.mitigationStatus !== undefined)
      updateData.mitigationStatus = data.mitigationStatus;
    if (data.residualRisk !== undefined)
      updateData.residualRisk = data.residualRisk;
    if (data.regulatoryRefs !== undefined)
      updateData.regulatoryRefs = data.regulatoryRefs;
    if (data.fmecaNotes !== undefined) updateData.fmecaNotes = data.fmecaNotes;

    // Auto-recompute riskIndex if severity or likelihood changed
    const newSeverity = data.severity ?? existing.severity;
    const newLikelihood = data.likelihood ?? existing.likelihood;
    if (data.severity !== undefined || data.likelihood !== undefined) {
      const severityScore = SEVERITY_SCORES[newSeverity];
      updateData.riskIndex = severityScore * newLikelihood;
    }

    const entry = await prisma.hazardEntry.update({
      where: { id: hazardId, organizationId: orgId },
      data: updateData,
      include: {
        mitigations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ entry });
  } catch (err) {
    logger.error("[hazards/[hazardId]] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
