import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateTPLRequirement,
  getRequiredInsuranceTypes,
  calculateMissionRiskLevel,
  calculateInsuranceComplianceScore,
  type InsuranceRiskProfile,
  type JurisdictionCode,
  type OperatorType,
  type CompanySize,
  type OrbitRegime,
  type PolicyStatus,
} from "@/data/insurance-requirements";
import { logger } from "@/lib/logger";

// GET /api/insurance/[assessmentId] - Get assessment details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    const assessment = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        policies: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build profile for calculations
    const profile: InsuranceRiskProfile = {
      primaryJurisdiction: assessment.primaryJurisdiction as JurisdictionCode,
      operatorType: assessment.operatorType as OperatorType,
      companySize: assessment.companySize as CompanySize,
      orbitRegime: assessment.orbitRegime as OrbitRegime,
      satelliteCount: assessment.satelliteCount,
      satelliteValueEur: assessment.satelliteValueEur || 0,
      totalMissionValueEur: assessment.totalMissionValueEur || 0,
      isConstellationOperator: assessment.isConstellationOperator,
      hasManeuverability: assessment.hasManeuverability,
      missionDurationYears: assessment.missionDurationYears,
      hasFlightHeritage: assessment.hasFlightHeritage,
      launchVehicle: assessment.launchVehicle || undefined,
      launchProvider: assessment.launchProvider || undefined,
      hasADR: assessment.hasADR,
      hasPropulsion: assessment.hasPropulsion,
      hasHazardousMaterials: assessment.hasHazardousMaterials,
      crossBorderOps: assessment.crossBorderOps,
      annualRevenueEur: assessment.annualRevenueEur || undefined,
      turnoversShareSpace: assessment.turnoversShareSpace || undefined,
    };

    // Calculate TPL
    const tplRequirement = calculateTPLRequirement(profile);

    // Get required types
    const requiredTypes = getRequiredInsuranceTypes(profile);

    // Build status map for compliance calculation
    const statusMap: Record<string, PolicyStatus> = {};
    assessment.policies.forEach((p) => {
      statusMap[p.insuranceType] = p.status as PolicyStatus;
    });

    // Calculate compliance score
    const complianceScore = calculateInsuranceComplianceScore(
      requiredTypes,
      statusMap,
    );

    return NextResponse.json({
      assessment,
      tplRequirement,
      requiredTypes,
      complianceScore,
    });
  } catch (error) {
    logger.error("Error fetching insurance assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/insurance/[assessmentId] - Update assessment profile
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const patchSchema = z.object({
      assessmentName: z.string().optional(),
      primaryJurisdiction: z.string().optional(),
      operatorType: z.string().optional(),
      companySize: z.string().optional(),
      orbitRegime: z.string().optional(),
      satelliteCount: z.number().optional(),
      satelliteValueEur: z.number().optional(),
      totalMissionValueEur: z.number().optional(),
      isConstellationOperator: z.boolean().optional(),
      hasManeuverability: z.boolean().optional(),
      missionDurationYears: z.number().optional(),
      hasFlightHeritage: z.boolean().optional(),
      launchVehicle: z.string().optional(),
      launchProvider: z.string().optional(),
      launchDate: z.string().nullable().optional(),
      hasADR: z.boolean().optional(),
      hasPropulsion: z.boolean().optional(),
      hasHazardousMaterials: z.boolean().optional(),
      crossBorderOps: z.boolean().optional(),
      annualRevenueEur: z.number().optional(),
      turnoversShareSpace: z.number().optional(),
    });

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify ownership
    const existing = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: { policies: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (parsed.data.assessmentName !== undefined)
      updateData.assessmentName = parsed.data.assessmentName;
    if (parsed.data.primaryJurisdiction !== undefined)
      updateData.primaryJurisdiction = parsed.data.primaryJurisdiction;
    if (parsed.data.operatorType !== undefined)
      updateData.operatorType = parsed.data.operatorType;
    if (parsed.data.companySize !== undefined)
      updateData.companySize = parsed.data.companySize;
    if (parsed.data.orbitRegime !== undefined)
      updateData.orbitRegime = parsed.data.orbitRegime;
    if (parsed.data.satelliteCount !== undefined)
      updateData.satelliteCount = parsed.data.satelliteCount;
    if (parsed.data.satelliteValueEur !== undefined)
      updateData.satelliteValueEur = parsed.data.satelliteValueEur;
    if (parsed.data.totalMissionValueEur !== undefined)
      updateData.totalMissionValueEur = parsed.data.totalMissionValueEur;
    if (parsed.data.isConstellationOperator !== undefined)
      updateData.isConstellationOperator = parsed.data.isConstellationOperator;
    if (parsed.data.hasManeuverability !== undefined)
      updateData.hasManeuverability = parsed.data.hasManeuverability;
    if (parsed.data.missionDurationYears !== undefined)
      updateData.missionDurationYears = parsed.data.missionDurationYears;
    if (parsed.data.hasFlightHeritage !== undefined)
      updateData.hasFlightHeritage = parsed.data.hasFlightHeritage;
    if (parsed.data.launchVehicle !== undefined)
      updateData.launchVehicle = parsed.data.launchVehicle;
    if (parsed.data.launchProvider !== undefined)
      updateData.launchProvider = parsed.data.launchProvider;
    if (parsed.data.launchDate !== undefined)
      updateData.launchDate = parsed.data.launchDate
        ? new Date(parsed.data.launchDate)
        : null;
    if (parsed.data.hasADR !== undefined)
      updateData.hasADR = parsed.data.hasADR;
    if (parsed.data.hasPropulsion !== undefined)
      updateData.hasPropulsion = parsed.data.hasPropulsion;
    if (parsed.data.hasHazardousMaterials !== undefined)
      updateData.hasHazardousMaterials = parsed.data.hasHazardousMaterials;
    if (parsed.data.crossBorderOps !== undefined)
      updateData.crossBorderOps = parsed.data.crossBorderOps;
    if (parsed.data.annualRevenueEur !== undefined)
      updateData.annualRevenueEur = parsed.data.annualRevenueEur;
    if (parsed.data.turnoversShareSpace !== undefined)
      updateData.turnoversShareSpace = parsed.data.turnoversShareSpace;

    // Recalculate TPL and risk if profile changed
    const profileFields = [
      "primaryJurisdiction",
      "operatorType",
      "companySize",
      "orbitRegime",
      "satelliteCount",
      "satelliteValueEur",
      "totalMissionValueEur",
      "hasHazardousMaterials",
      "hasFlightHeritage",
      "crossBorderOps",
      "annualRevenueEur",
    ] as const;
    const profileChanged = profileFields.some(
      (f) => parsed.data[f] !== undefined,
    );

    if (profileChanged) {
      const profile: InsuranceRiskProfile = {
        primaryJurisdiction: (parsed.data.primaryJurisdiction ||
          existing.primaryJurisdiction) as JurisdictionCode,
        operatorType: (parsed.data.operatorType ||
          existing.operatorType) as OperatorType,
        companySize: (parsed.data.companySize ||
          existing.companySize) as CompanySize,
        orbitRegime: (parsed.data.orbitRegime ||
          existing.orbitRegime) as OrbitRegime,
        satelliteCount: parsed.data.satelliteCount ?? existing.satelliteCount,
        satelliteValueEur:
          parsed.data.satelliteValueEur ?? existing.satelliteValueEur ?? 0,
        totalMissionValueEur:
          parsed.data.totalMissionValueEur ??
          existing.totalMissionValueEur ??
          0,
        isConstellationOperator:
          parsed.data.isConstellationOperator ??
          existing.isConstellationOperator,
        hasManeuverability:
          parsed.data.hasManeuverability ?? existing.hasManeuverability,
        missionDurationYears:
          parsed.data.missionDurationYears ?? existing.missionDurationYears,
        hasFlightHeritage:
          parsed.data.hasFlightHeritage ?? existing.hasFlightHeritage,
        launchVehicle:
          parsed.data.launchVehicle ?? existing.launchVehicle ?? undefined,
        launchProvider:
          parsed.data.launchProvider ?? existing.launchProvider ?? undefined,
        hasADR: parsed.data.hasADR ?? existing.hasADR,
        hasPropulsion: parsed.data.hasPropulsion ?? existing.hasPropulsion,
        hasHazardousMaterials:
          parsed.data.hasHazardousMaterials ?? existing.hasHazardousMaterials,
        crossBorderOps: parsed.data.crossBorderOps ?? existing.crossBorderOps,
        annualRevenueEur:
          parsed.data.annualRevenueEur ??
          existing.annualRevenueEur ??
          undefined,
        turnoversShareSpace:
          parsed.data.turnoversShareSpace ??
          existing.turnoversShareSpace ??
          undefined,
      };

      const tplRequirement = calculateTPLRequirement(profile);
      const riskLevel = calculateMissionRiskLevel(profile);
      const requiredTypes = getRequiredInsuranceTypes(profile);

      updateData.calculatedTPL = tplRequirement.amount;
      updateData.riskLevel = riskLevel;

      // Batch update required status for policies (avoid N+1)
      const nowRequiredIds = existing.policies
        .filter(
          (p) =>
            requiredTypes.includes(p.insuranceType as any) && !p.isRequired,
        )
        .map((p) => p.id);
      const nowOptionalIds = existing.policies
        .filter(
          (p) =>
            !requiredTypes.includes(p.insuranceType as any) && p.isRequired,
        )
        .map((p) => p.id);

      await Promise.all([
        nowRequiredIds.length > 0
          ? prisma.insurancePolicy.updateMany({
              where: { id: { in: nowRequiredIds } },
              data: { isRequired: true },
            })
          : Promise.resolve(),
        nowOptionalIds.length > 0
          ? prisma.insurancePolicy.updateMany({
              where: { id: { in: nowOptionalIds } },
              data: { isRequired: false },
            })
          : Promise.resolve(),
      ]);
    }

    const updated = await prisma.insuranceAssessment.update({
      where: { id: assessmentId },
      data: updateData,
      include: { policies: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "insurance_assessment_updated",
      entityType: "insurance_assessment",
      entityId: assessmentId,
      previousValue: { ...existing, policies: undefined },
      newValue: parsed.data,
      description: "Updated insurance assessment profile",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    logger.error("Error updating insurance assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/insurance/[assessmentId] - Delete assessment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Verify ownership
    const existing = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete (cascades to policies)
    await prisma.insuranceAssessment.delete({
      where: { id: assessmentId },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "insurance_assessment_deleted",
      entityType: "insurance_assessment",
      entityId: assessmentId,
      previousValue: { deleted: true, assessmentName: existing.assessmentName },
      description: "Deleted insurance assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting insurance assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
