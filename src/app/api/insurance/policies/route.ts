import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateInsuranceComplianceScore,
  getRequiredInsuranceTypes,
  type InsuranceRiskProfile,
  type JurisdictionCode,
  type OperatorType,
  type CompanySize,
  type OrbitRegime,
  type PolicyStatus,
} from "@/data/insurance-requirements";

// GET /api/insurance/policies - Get policies for an assessment
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const assessment = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        policies: {
          orderBy: { insuranceType: "asc" },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      policies: assessment.policies,
      assessment: {
        id: assessment.id,
        assessmentName: assessment.assessmentName,
        primaryJurisdiction: assessment.primaryJurisdiction,
        calculatedTPL: assessment.calculatedTPL,
        riskLevel: assessment.riskLevel,
      },
    });
  } catch (error) {
    console.error("Error fetching insurance policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/insurance/policies - Update policy status/details
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      assessmentId,
      insuranceType,
      status,
      policyNumber,
      insurer,
      broker,
      coverageAmount,
      premium,
      deductible,
      effectiveDate,
      expirationDate,
      renewalDate,
      notes,
      quoteNotes,
    } = body;

    if (!assessmentId || !insuranceType) {
      return NextResponse.json(
        {
          error: "assessmentId and insuranceType are required",
        },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const assessment = await prisma.insuranceAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Get previous state for audit
    const previous = await prisma.insurancePolicy.findUnique({
      where: {
        assessmentId_insuranceType: {
          assessmentId,
          insuranceType,
        },
      },
    });

    if (!previous) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (policyNumber !== undefined) updateData.policyNumber = policyNumber;
    if (insurer !== undefined) updateData.insurer = insurer;
    if (broker !== undefined) updateData.broker = broker;
    if (coverageAmount !== undefined)
      updateData.coverageAmount = coverageAmount;
    if (premium !== undefined) updateData.premium = premium;
    if (deductible !== undefined) updateData.deductible = deductible;
    if (effectiveDate !== undefined)
      updateData.effectiveDate = effectiveDate ? new Date(effectiveDate) : null;
    if (expirationDate !== undefined)
      updateData.expirationDate = expirationDate
        ? new Date(expirationDate)
        : null;
    if (renewalDate !== undefined)
      updateData.renewalDate = renewalDate ? new Date(renewalDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (quoteNotes !== undefined) updateData.quoteNotes = quoteNotes;

    // Update policy
    const updated = await prisma.insurancePolicy.update({
      where: {
        assessmentId_insuranceType: {
          assessmentId,
          insuranceType,
        },
      },
      data: updateData,
    });

    // Recalculate compliance score
    const allPolicies = await prisma.insurancePolicy.findMany({
      where: { assessmentId },
    });

    // Build profile for required types
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

    const requiredTypes = getRequiredInsuranceTypes(profile);
    const statusMap: Record<string, PolicyStatus> = {};
    allPolicies.forEach((p) => {
      statusMap[p.insuranceType] = p.status as PolicyStatus;
    });

    const complianceScore = calculateInsuranceComplianceScore(
      requiredTypes,
      statusMap,
    );

    // Update assessment compliance score
    await prisma.insuranceAssessment.update({
      where: { id: assessmentId },
      data: { complianceScore },
    });

    // Log audit event if status changed
    if (previous.status !== status) {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId,
        action: "insurance_policy_status_changed",
        entityType: "insurance_policy",
        entityId: updated.id,
        previousValue: { status: previous.status },
        newValue: { status },
        description: `Changed policy "${insuranceType}" status to "${status}"`,
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({
      policy: updated,
      complianceScore,
    });
  } catch (error) {
    console.error("Error updating insurance policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
