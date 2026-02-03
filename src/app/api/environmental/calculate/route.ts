import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateScreeningLCA,
  calculateComplianceScore,
  type MissionProfile,
  type LaunchVehicleId,
  type PropellantType,
} from "@/data/environmental-requirements";

// POST /api/environmental/calculate - Calculate environmental footprint
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Get assessment
    const assessment = await prisma.environmentalAssessment.findFirst({
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

    // Build mission profile for calculation
    const missionProfile: MissionProfile = {
      missionName: assessment.missionName || "Unnamed Mission",
      operatorType: assessment.operatorType as
        | "spacecraft"
        | "launch"
        | "launch_site",
      missionType: assessment.missionType as
        | "commercial"
        | "research"
        | "government"
        | "educational",
      spacecraftMassKg: assessment.spacecraftMassKg,
      spacecraftCount: assessment.spacecraftCount,
      orbitType: assessment.orbitType as
        | "LEO"
        | "MEO"
        | "GEO"
        | "HEO"
        | "cislunar"
        | "deep_space",
      altitudeKm: assessment.altitudeKm || undefined,
      missionDurationYears: assessment.missionDurationYears,
      launchVehicle: assessment.launchVehicle as LaunchVehicleId,
      launchSharePercent: assessment.launchSharePercent,
      launchSiteCountry: assessment.launchSiteCountry || "Unknown",
      spacecraftPropellant: assessment.spacecraftPropellant as
        | PropellantType
        | undefined,
      propellantMassKg: assessment.propellantMassKg || undefined,
      groundStationCount: assessment.groundStationCount,
      dailyContactHours: assessment.dailyContactHours,
      deorbitStrategy: assessment.deorbitStrategy as
        | "controlled_deorbit"
        | "passive_decay"
        | "graveyard_orbit"
        | "retrieval",
      isSmallEnterprise: assessment.isSmallEnterprise,
      isResearchEducation: assessment.isResearchEducation,
    };

    // Calculate screening LCA
    const result = calculateScreeningLCA(missionProfile);

    // Calculate compliance score
    const complianceScore = calculateComplianceScore(result);

    // Delete existing impact results and create new ones
    await prisma.environmentalImpactResult.deleteMany({
      where: { assessmentId },
    });

    // Create impact results for each lifecycle phase
    const impactResultsData = result.lifecycleBreakdown.map((phase) => ({
      assessmentId,
      phase: phase.phase,
      gwpKgCO2eq: phase.gwpKgCO2eq,
      odpKgCFC11eq: phase.odpKgCFC11eq,
      percentOfTotal: phase.percentOfTotal,
    }));

    await prisma.environmentalImpactResult.createMany({
      data: impactResultsData,
    });

    // Update assessment with results
    const updated = await prisma.environmentalAssessment.update({
      where: { id: assessmentId },
      data: {
        status: "calculation",
        totalGWP: result.totalGWP,
        totalODP: result.totalODP,
        carbonIntensity: result.carbonIntensity,
        efdGrade: result.grade,
        complianceScore,
        isSimplifiedAssessment: result.isSimplifiedAssessment,
      },
      include: {
        impactResults: true,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "environmental_calculation_completed",
      entityType: "environmental_assessment",
      entityId: assessmentId,
      newValue: {
        totalGWP: result.totalGWP,
        carbonIntensity: result.carbonIntensity,
        grade: result.grade,
        complianceScore,
      },
      description: "Completed environmental footprint calculation",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: updated,
      result: {
        totalGWP: result.totalGWP,
        totalODP: result.totalODP,
        carbonIntensity: result.carbonIntensity,
        grade: result.grade,
        gradeLabel: result.gradeLabel,
        lifecycleBreakdown: result.lifecycleBreakdown,
        hotspots: result.hotspots,
        recommendations: result.recommendations,
        isSimplifiedAssessment: result.isSimplifiedAssessment,
        regulatoryCompliance: result.regulatoryCompliance,
        complianceScore,
      },
    });
  } catch (error) {
    console.error("Error calculating environmental footprint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
