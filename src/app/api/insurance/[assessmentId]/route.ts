import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
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
    console.error("Error fetching insurance assessment:", error);
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

    if (body.assessmentName !== undefined)
      updateData.assessmentName = body.assessmentName;
    if (body.primaryJurisdiction !== undefined)
      updateData.primaryJurisdiction = body.primaryJurisdiction;
    if (body.operatorType !== undefined)
      updateData.operatorType = body.operatorType;
    if (body.companySize !== undefined)
      updateData.companySize = body.companySize;
    if (body.orbitRegime !== undefined)
      updateData.orbitRegime = body.orbitRegime;
    if (body.satelliteCount !== undefined)
      updateData.satelliteCount = body.satelliteCount;
    if (body.satelliteValueEur !== undefined)
      updateData.satelliteValueEur = body.satelliteValueEur;
    if (body.totalMissionValueEur !== undefined)
      updateData.totalMissionValueEur = body.totalMissionValueEur;
    if (body.isConstellationOperator !== undefined)
      updateData.isConstellationOperator = body.isConstellationOperator;
    if (body.hasManeuverability !== undefined)
      updateData.hasManeuverability = body.hasManeuverability;
    if (body.missionDurationYears !== undefined)
      updateData.missionDurationYears = body.missionDurationYears;
    if (body.hasFlightHeritage !== undefined)
      updateData.hasFlightHeritage = body.hasFlightHeritage;
    if (body.launchVehicle !== undefined)
      updateData.launchVehicle = body.launchVehicle;
    if (body.launchProvider !== undefined)
      updateData.launchProvider = body.launchProvider;
    if (body.launchDate !== undefined)
      updateData.launchDate = body.launchDate
        ? new Date(body.launchDate)
        : null;
    if (body.hasADR !== undefined) updateData.hasADR = body.hasADR;
    if (body.hasPropulsion !== undefined)
      updateData.hasPropulsion = body.hasPropulsion;
    if (body.hasHazardousMaterials !== undefined)
      updateData.hasHazardousMaterials = body.hasHazardousMaterials;
    if (body.crossBorderOps !== undefined)
      updateData.crossBorderOps = body.crossBorderOps;
    if (body.annualRevenueEur !== undefined)
      updateData.annualRevenueEur = body.annualRevenueEur;
    if (body.turnoversShareSpace !== undefined)
      updateData.turnoversShareSpace = body.turnoversShareSpace;

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
    ];
    const profileChanged = profileFields.some((f) => body[f] !== undefined);

    if (profileChanged) {
      const profile: InsuranceRiskProfile = {
        primaryJurisdiction: (body.primaryJurisdiction ||
          existing.primaryJurisdiction) as JurisdictionCode,
        operatorType: (body.operatorType ||
          existing.operatorType) as OperatorType,
        companySize: (body.companySize || existing.companySize) as CompanySize,
        orbitRegime: (body.orbitRegime || existing.orbitRegime) as OrbitRegime,
        satelliteCount: body.satelliteCount ?? existing.satelliteCount,
        satelliteValueEur:
          body.satelliteValueEur ?? existing.satelliteValueEur ?? 0,
        totalMissionValueEur:
          body.totalMissionValueEur ?? existing.totalMissionValueEur ?? 0,
        isConstellationOperator:
          body.isConstellationOperator ?? existing.isConstellationOperator,
        hasManeuverability:
          body.hasManeuverability ?? existing.hasManeuverability,
        missionDurationYears:
          body.missionDurationYears ?? existing.missionDurationYears,
        hasFlightHeritage: body.hasFlightHeritage ?? existing.hasFlightHeritage,
        launchVehicle:
          body.launchVehicle ?? existing.launchVehicle ?? undefined,
        launchProvider:
          body.launchProvider ?? existing.launchProvider ?? undefined,
        hasADR: body.hasADR ?? existing.hasADR,
        hasPropulsion: body.hasPropulsion ?? existing.hasPropulsion,
        hasHazardousMaterials:
          body.hasHazardousMaterials ?? existing.hasHazardousMaterials,
        crossBorderOps: body.crossBorderOps ?? existing.crossBorderOps,
        annualRevenueEur:
          body.annualRevenueEur ?? existing.annualRevenueEur ?? undefined,
        turnoversShareSpace:
          body.turnoversShareSpace ?? existing.turnoversShareSpace ?? undefined,
      };

      const tplRequirement = calculateTPLRequirement(profile);
      const riskLevel = calculateMissionRiskLevel(profile);
      const requiredTypes = getRequiredInsuranceTypes(profile);

      updateData.calculatedTPL = tplRequirement.amount;
      updateData.riskLevel = riskLevel;

      // Update required status for policies
      for (const policy of existing.policies) {
        const isNowRequired = requiredTypes.includes(
          policy.insuranceType as any,
        );
        if (policy.isRequired !== isNowRequired) {
          await prisma.insurancePolicy.update({
            where: { id: policy.id },
            data: { isRequired: isNowRequired },
          });
        }
      }
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
      newValue: body,
      description: "Updated insurance assessment profile",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error("Error updating insurance assessment:", error);
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
    console.error("Error deleting insurance assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
