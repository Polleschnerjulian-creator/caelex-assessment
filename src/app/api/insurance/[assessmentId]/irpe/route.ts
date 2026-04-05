import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { calculateIRPEScore } from "@/lib/irpe-engine.server";
import { logger } from "@/lib/logger";

// GET /api/insurance/[assessmentId]/irpe — IRPE Risk Pricing Report
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting — assessment tier
    const rateLimitResult = await checkRateLimit("assessment", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Org-scoped access check
    const orgContext = await getCurrentOrganization(userId);
    const organizationId = orgContext?.organizationId;

    // Verify the user has access to this assessment
    const assessment = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        OR: [{ userId }, ...(organizationId ? [{ organizationId }] : [])],
      },
      select: { id: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Calculate IRPE score
    const irpeScore = await calculateIRPEScore(
      assessmentId,
      organizationId || "",
      userId,
    );

    return NextResponse.json(irpeScore);
  } catch (error) {
    logger.error("IRPE calculation failed", error);
    return NextResponse.json(
      { error: "Failed to calculate IRPE score" },
      { status: 500 },
    );
  }
}
