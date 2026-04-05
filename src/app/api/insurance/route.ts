import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
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
import { logger } from "@/lib/logger";

// GET /api/insurance - List all insurance assessments for user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting — api tier for reads
    const rateLimitResult = await checkRateLimit("api", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    // Resolve organization context for multi-tenant scoping
    const orgContext = await getCurrentOrganization(userId);
    const where: Record<string, unknown> = { userId };
    if (orgContext?.organizationId) {
      where.organizationId = orgContext.organizationId;
    }

    const [assessments, total] = await Promise.all([
      prisma.insuranceAssessment.findMany({
        where,
        include: {
          policies: true,
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.insuranceAssessment.count({ where }),
    ]);

    return NextResponse.json({
      assessments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("Error fetching insurance assessments", error);
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

    // Rate limiting — sensitive tier for writes
    const postRateLimitResult = await checkRateLimit(
      "sensitive",
      session.user.id,
    );
    if (!postRateLimitResult.success) {
      return createRateLimitResponse(postRateLimitResult);
    }

    const userId = session.user.id;
    const body = await request.json();

    const schema = z.object({
      assessmentName: z.string().optional(),
      primaryJurisdiction: z.string().min(1),
      operatorType: z.string().min(1),
      companySize: z.string().min(1),
      orbitRegime: z.string().min(1),
      satelliteCount: z.number().optional(),
      satelliteValueEur: z.number().optional(),
      totalMissionValueEur: z.number().optional(),
      isConstellationOperator: z.boolean().optional(),
      hasManeuverability: z.boolean().optional(),
      missionDurationYears: z.number().optional(),
      hasFlightHeritage: z.boolean().optional(),
      launchVehicle: z.string().optional(),
      launchProvider: z.string().optional(),
      launchDate: z.string().optional(),
      hasADR: z.boolean().optional(),
      hasPropulsion: z.boolean().optional(),
      hasHazardousMaterials: z.boolean().optional(),
      crossBorderOps: z.boolean().optional(),
      annualRevenueEur: z.number().optional(),
      turnoversShareSpace: z.number().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Build risk profile for calculations
    const profile: InsuranceRiskProfile = {
      primaryJurisdiction: parsed.data.primaryJurisdiction as JurisdictionCode,
      operatorType: parsed.data.operatorType as OperatorType,
      companySize: parsed.data.companySize as CompanySize,
      orbitRegime: parsed.data.orbitRegime as OrbitRegime,
      satelliteCount: parsed.data.satelliteCount || 1,
      satelliteValueEur: parsed.data.satelliteValueEur || 0,
      totalMissionValueEur: parsed.data.totalMissionValueEur || 0,
      isConstellationOperator: parsed.data.isConstellationOperator || false,
      hasManeuverability: parsed.data.hasManeuverability || false,
      missionDurationYears: parsed.data.missionDurationYears || 5,
      hasFlightHeritage: parsed.data.hasFlightHeritage || false,
      launchVehicle: parsed.data.launchVehicle || undefined,
      launchProvider: parsed.data.launchProvider || undefined,
      hasADR: parsed.data.hasADR || false,
      hasPropulsion: parsed.data.hasPropulsion || false,
      hasHazardousMaterials: parsed.data.hasHazardousMaterials || false,
      crossBorderOps: parsed.data.crossBorderOps || false,
      annualRevenueEur: parsed.data.annualRevenueEur || undefined,
      turnoversShareSpace: parsed.data.turnoversShareSpace || undefined,
    };

    // Calculate TPL requirement
    const tplRequirement = calculateTPLRequirement(profile);

    // Calculate risk level
    const riskLevel = calculateMissionRiskLevel(profile);

    // Get required insurance types
    const requiredTypes = getRequiredInsuranceTypes(profile);

    // Resolve organization context for multi-tenant scoping
    const orgCtx = await getCurrentOrganization(userId);

    // Create assessment
    const assessment = await prisma.insuranceAssessment.create({
      data: {
        userId,
        organizationId: orgCtx?.organizationId || null,
        assessmentName: parsed.data.assessmentName || null,
        primaryJurisdiction: parsed.data.primaryJurisdiction,
        operatorType: parsed.data.operatorType,
        companySize: parsed.data.companySize,
        orbitRegime: parsed.data.orbitRegime,
        satelliteCount: parsed.data.satelliteCount || 1,
        satelliteValueEur: parsed.data.satelliteValueEur || null,
        totalMissionValueEur: parsed.data.totalMissionValueEur || null,
        isConstellationOperator: parsed.data.isConstellationOperator || false,
        hasManeuverability: parsed.data.hasManeuverability || false,
        missionDurationYears: parsed.data.missionDurationYears || 5,
        hasFlightHeritage: parsed.data.hasFlightHeritage || false,
        launchVehicle: parsed.data.launchVehicle || null,
        launchProvider: parsed.data.launchProvider || null,
        launchDate: parsed.data.launchDate
          ? new Date(parsed.data.launchDate)
          : null,
        hasADR: parsed.data.hasADR || false,
        hasPropulsion: parsed.data.hasPropulsion || false,
        hasHazardousMaterials: parsed.data.hasHazardousMaterials || false,
        crossBorderOps: parsed.data.crossBorderOps || false,
        annualRevenueEur: parsed.data.annualRevenueEur || null,
        turnoversShareSpace: parsed.data.turnoversShareSpace || null,
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
        primaryJurisdiction: parsed.data.primaryJurisdiction,
        operatorType: parsed.data.operatorType,
        calculatedTPL: tplRequirement.amount,
        riskLevel,
      },
      description: "Created new insurance assessment",
      ipAddress,
      userAgent,
    });

    // Sync to authorization document status (best-effort)
    try {
      const { syncAssessmentToAuthorizationDocs } =
        await import("@/lib/services/authorization-document-sync.server");
      await syncAssessmentToAuthorizationDocs(
        orgCtx?.organizationId || null,
        userId,
        "insurance",
      );
    } catch (syncErr) {
      logger.warn("Failed to sync to authorization docs", syncErr);
    }

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
    logger.error("Error creating insurance assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
