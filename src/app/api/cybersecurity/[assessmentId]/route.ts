import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { safeJsonParseArray } from "@/lib/validations";
import {
  getApplicableRequirements,
  isEligibleForSimplifiedRegime,
  type CybersecurityProfile,
  type OrganizationSize,
  type SpaceSegmentComplexity,
  type DataSensitivityLevel,
} from "@/data/cybersecurity-requirements";

// GET /api/cybersecurity/[assessmentId] - Get assessment details
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

    const assessment = await prisma.cybersecurityAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        requirements: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error("Error fetching cybersecurity assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/cybersecurity/[assessmentId] - Update assessment profile
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
    const existing = await prisma.cybersecurityAssessment.findFirst({
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

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.assessmentName !== undefined)
      updateData.assessmentName = body.assessmentName;
    if (body.organizationSize !== undefined)
      updateData.organizationSize = body.organizationSize;
    if (body.employeeCount !== undefined)
      updateData.employeeCount = body.employeeCount;
    if (body.annualRevenue !== undefined)
      updateData.annualRevenue = body.annualRevenue;
    if (body.spaceSegmentComplexity !== undefined)
      updateData.spaceSegmentComplexity = body.spaceSegmentComplexity;
    if (body.satelliteCount !== undefined)
      updateData.satelliteCount = body.satelliteCount;
    if (body.hasGroundSegment !== undefined)
      updateData.hasGroundSegment = body.hasGroundSegment;
    if (body.groundStationCount !== undefined)
      updateData.groundStationCount = body.groundStationCount;
    if (body.dataSensitivityLevel !== undefined)
      updateData.dataSensitivityLevel = body.dataSensitivityLevel;
    if (body.processesPersonalData !== undefined)
      updateData.processesPersonalData = body.processesPersonalData;
    if (body.handlesGovData !== undefined)
      updateData.handlesGovData = body.handlesGovData;
    if (body.existingCertifications !== undefined)
      updateData.existingCertifications = JSON.stringify(
        body.existingCertifications,
      );
    if (body.hasSecurityTeam !== undefined)
      updateData.hasSecurityTeam = body.hasSecurityTeam;
    if (body.securityTeamSize !== undefined)
      updateData.securityTeamSize = body.securityTeamSize;
    if (body.hasIncidentResponsePlan !== undefined)
      updateData.hasIncidentResponsePlan = body.hasIncidentResponsePlan;
    if (body.hasBCP !== undefined) updateData.hasBCP = body.hasBCP;
    if (body.criticalSupplierCount !== undefined)
      updateData.criticalSupplierCount = body.criticalSupplierCount;
    if (body.supplierSecurityAssessed !== undefined)
      updateData.supplierSecurityAssessed = body.supplierSecurityAssessed;
    if (body.maturityScore !== undefined)
      updateData.maturityScore = body.maturityScore;

    // Recalculate simplified regime if profile changed
    const profileFields = [
      "organizationSize",
      "spaceSegmentComplexity",
      "processesPersonalData",
      "handlesGovData",
      "satelliteCount",
    ];
    const profileChanged = profileFields.some((f) => body[f] !== undefined);

    if (profileChanged) {
      // Build new profile
      const profile: CybersecurityProfile = {
        organizationSize: (body.organizationSize ||
          existing.organizationSize) as OrganizationSize,
        employeeCount:
          body.employeeCount ?? existing.employeeCount ?? undefined,
        annualRevenue:
          body.annualRevenue ?? existing.annualRevenue ?? undefined,
        spaceSegmentComplexity: (body.spaceSegmentComplexity ||
          existing.spaceSegmentComplexity) as SpaceSegmentComplexity,
        satelliteCount:
          body.satelliteCount ?? existing.satelliteCount ?? undefined,
        hasGroundSegment: body.hasGroundSegment ?? existing.hasGroundSegment,
        groundStationCount:
          body.groundStationCount ?? existing.groundStationCount ?? undefined,
        dataSensitivityLevel: (body.dataSensitivityLevel ||
          existing.dataSensitivityLevel) as DataSensitivityLevel,
        processesPersonalData:
          body.processesPersonalData ?? existing.processesPersonalData,
        handlesGovData: body.handlesGovData ?? existing.handlesGovData,
        existingCertifications:
          body.existingCertifications ||
          safeJsonParseArray<string>(existing.existingCertifications),
        hasSecurityTeam: body.hasSecurityTeam ?? existing.hasSecurityTeam,
        securityTeamSize:
          body.securityTeamSize ?? existing.securityTeamSize ?? undefined,
        hasIncidentResponsePlan:
          body.hasIncidentResponsePlan ?? existing.hasIncidentResponsePlan,
        hasBCP: body.hasBCP ?? existing.hasBCP,
        criticalSupplierCount:
          body.criticalSupplierCount ??
          existing.criticalSupplierCount ??
          undefined,
        supplierSecurityAssessed:
          body.supplierSecurityAssessed ?? existing.supplierSecurityAssessed,
      };

      updateData.isSimplifiedRegime = isEligibleForSimplifiedRegime(profile);

      // Update applicable requirements
      const applicableRequirements = getApplicableRequirements(profile);
      const existingReqs = await prisma.cybersecurityRequirementStatus.findMany(
        {
          where: { assessmentId },
        },
      );

      const existingReqIds = new Set(existingReqs.map((r) => r.requirementId));
      const applicableReqIds = new Set(applicableRequirements.map((r) => r.id));

      // Add new requirements
      const toAdd = applicableRequirements.filter(
        (r) => !existingReqIds.has(r.id),
      );
      if (toAdd.length > 0) {
        await prisma.cybersecurityRequirementStatus.createMany({
          data: toAdd.map((r) => ({
            assessmentId,
            requirementId: r.id,
            status: "not_assessed",
          })),
        });
      }

      // Remove requirements that are no longer applicable
      const toRemove = existingReqs.filter(
        (r) => !applicableReqIds.has(r.requirementId),
      );
      if (toRemove.length > 0) {
        await prisma.cybersecurityRequirementStatus.deleteMany({
          where: {
            id: { in: toRemove.map((r) => r.id) },
          },
        });
      }
    }

    const updated = await prisma.cybersecurityAssessment.update({
      where: { id: assessmentId },
      data: updateData,
      include: { requirements: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cybersecurity_assessment_updated",
      entityType: "cybersecurity_assessment",
      entityId: assessmentId,
      previousValue: { ...existing },
      newValue: body,
      description: "Updated cybersecurity assessment profile",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error("Error updating cybersecurity assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/cybersecurity/[assessmentId] - Delete assessment
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
    const existing = await prisma.cybersecurityAssessment.findFirst({
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

    // Delete (cascades to requirements)
    await prisma.cybersecurityAssessment.delete({
      where: { id: assessmentId },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cybersecurity_assessment_updated",
      entityType: "cybersecurity_assessment",
      entityId: assessmentId,
      previousValue: { deleted: true, assessmentName: existing.assessmentName },
      description: "Deleted cybersecurity assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cybersecurity assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
