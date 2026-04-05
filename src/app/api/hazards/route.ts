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
import { getUserRole } from "@/lib/services/organization-service";
import { roleHasPermission } from "@/lib/permissions";
import { z } from "zod";

// ─── Severity score mapping ───

const SEVERITY_SCORES: Record<string, number> = {
  CATASTROPHIC: 4,
  CRITICAL: 3,
  MARGINAL: 2,
  NEGLIGIBLE: 1,
};

// ─── Validation ───

const createHazardSchema = z.object({
  spacecraftId: z.string().min(1),
  hazardId: z.string().min(1), // e.g. "G01", "G02"
  hazardType: z.enum([
    "COLLISION",
    "REENTRY",
    "EXPLOSION",
    "CONTROL_LOSS",
    "TOXICITY",
    "DEBRIS_GENERATION",
    "CYBER",
  ]),
  sourceModule: z.enum([
    "SHIELD",
    "DEBRIS",
    "INCIDENTS",
    "EPHEMERIS",
    "MANUAL",
  ]),
  sourceRecordId: z.string().optional(),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  severity: z.enum(["CATASTROPHIC", "CRITICAL", "MARGINAL", "NEGLIGIBLE"]),
  likelihood: z.number().int().min(1).max(5),
  regulatoryRefs: z.array(z.string()).optional(),
  fmecaNotes: z.string().optional(),
});

// ─── POST: Create new HazardEntry ───

export async function POST(request: NextRequest) {
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

    // RBAC: require MEMBER+ (compliance:write)
    const userRole = await getUserRole(orgId, session.user.id);
    if (!userRole || !roleHasPermission(userRole, "compliance:write")) {
      return NextResponse.json(
        { error: "Insufficient permissions to create hazards" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createHazardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      spacecraftId,
      hazardId,
      hazardType,
      sourceModule,
      sourceRecordId,
      title,
      description,
      severity,
      likelihood,
      regulatoryRefs,
      fmecaNotes,
    } = parsed.data;

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

    // Auto-compute riskIndex
    const severityScore = SEVERITY_SCORES[severity];
    const riskIndex = severityScore * likelihood;

    const entry = await prisma.hazardEntry.create({
      data: {
        organizationId: orgId,
        spacecraftId,
        hazardId,
        hazardType,
        sourceModule,
        sourceRecordId: sourceRecordId ?? null,
        title,
        description,
        severity,
        likelihood,
        riskIndex,
        regulatoryRefs: regulatoryRefs ?? [],
        fmecaNotes: fmecaNotes ?? null,
      },
      include: {
        mitigations: true,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    logger.error("[hazards] POST error:", err);

    // Handle unique constraint violation (spacecraftId + hazardId)
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return NextResponse.json(
        { error: "A hazard with this ID already exists for this spacecraft" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
