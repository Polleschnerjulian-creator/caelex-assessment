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
  type InsuranceType,
} from "@/data/insurance-requirements";

// GET /api/insurance - List all insurance assessments for user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.insuranceAssessment.findMany({
      where: { userId },
      include: {
        policies: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching insurance assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/insurance - Create new insurance assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "primaryJurisdiction",
      "operatorType",
      "companySize",
      "orbitRegime",
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    // Build risk profile for calculations
    const profile: InsuranceRiskProfile = {
      primaryJurisdiction: body.primaryJurisdiction as JurisdictionCode,
      operatorType: body.operatorType as OperatorType,
      companySize: body.companySize as CompanySize,
      orbitRegime: body.orbitRegime as OrbitRegime,
      satelliteCount: body.satelliteCount || 1,
      satelliteValueEur: body.satelliteValueEur || 0,
      totalMissionValueEur: body.totalMissionValueEur || 0,
      isConstellationOperator: body.isConstellationOperator || false,
      hasManeuverability: body.hasManeuverability || false,
      missionDurationYears: body.missionDurationYears || 5,
      hasFlightHeritage: body.hasFlightHeritage || false,
      launchVehicle: body.launchVehicle || undefined,
      launchProvider: body.launchProvider || undefined,
      hasADR: body.hasADR || false,
      hasPropulsion: body.hasPropulsion || false,
      hasHazardousMaterials: body.hasHazardousMaterials || false,
      crossBorderOps: body.crossBorderOps || false,
      annualRevenueEur: body.annualRevenueEur || undefined,
      turnoversShareSpace: body.turnoversShareSpace || undefined,
    };

    // Calculate TPL requirement
    const tplRequirement = calculateTPLRequirement(profile);

    // Calculate risk level
    const riskLevel = calculateMissionRiskLevel(profile);

    // Get required insurance types
    const requiredTypes = getRequiredInsuranceTypes(profile);

    // Create assessment
    const assessment = await prisma.insuranceAssessment.create({
      data: {
        userId,
        assessmentName: body.assessmentName || null,
        primaryJurisdiction: body.primaryJurisdiction,
        operatorType: body.operatorType,
        companySize: body.companySize,
        orbitRegime: body.orbitRegime,
        satelliteCount: body.satelliteCount || 1,
        satelliteValueEur: body.satelliteValueEur || null,
        totalMissionValueEur: body.totalMissionValueEur || null,
        isConstellationOperator: body.isConstellationOperator || false,
        hasManeuverability: body.hasManeuverability || false,
        missionDurationYears: body.missionDurationYears || 5,
        hasFlightHeritage: body.hasFlightHeritage || false,
        launchVehicle: body.launchVehicle || null,
        launchProvider: body.launchProvider || null,
        launchDate: body.launchDate ? new Date(body.launchDate) : null,
        hasADR: body.hasADR || false,
        hasPropulsion: body.hasPropulsion || false,
        hasHazardousMaterials: body.hasHazardousMaterials || false,
        crossBorderOps: body.crossBorderOps || false,
        annualRevenueEur: body.annualRevenueEur || null,
        turnoversShareSpace: body.turnoversShareSpace || null,
        calculatedTPL: tplRequirement.amount,
        riskLevel,
      },
    });

    // Create policy records for each required insurance type
    const allInsuranceTypes: InsuranceType[] = [
      "pre_launch",
      "launch",
      "in_orbit",
      "third_party_liability",
      "contingent_liability",
      "loss_of_revenue",
      "launch_plus_life",
    ];

    const policyData = allInsuranceTypes.map((type) => ({
      assessmentId: assessment.id,
      insuranceType: type,
      status: "not_started",
      isRequired: requiredTypes.includes(type),
    }));

    await prisma.insurancePolicy.createMany({
      data: policyData,
    });

    // Fetch assessment with policies
    const assessmentWithPolicies = await prisma.insuranceAssessment.findUnique({
      where: { id: assessment.id },
      include: { policies: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "insurance_assessment_created",
      entityType: "insurance_assessment",
      entityId: assessment.id,
      newValue: {
        primaryJurisdiction: body.primaryJurisdiction,
        operatorType: body.operatorType,
        calculatedTPL: tplRequirement.amount,
        riskLevel,
      },
      description: "Created new insurance assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        assessment: assessmentWithPolicies,
        tplRequirement,
        riskLevel,
        requiredTypes,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating insurance assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
