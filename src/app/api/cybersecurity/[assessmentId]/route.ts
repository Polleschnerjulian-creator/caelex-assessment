import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { safeJsonParseArray } from "@/lib/validations";
import { decrypt, isEncrypted } from "@/lib/encryption";
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

    // Decrypt sensitive fields in requirements
    const decryptedRequirements = await Promise.all(
      assessment.requirements.map(async (req) => ({
        ...req,
        notes:
          req.notes && isEncrypted(req.notes)
            ? await decrypt(req.notes)
            : req.notes,
        evidenceNotes:
          req.evidenceNotes && isEncrypted(req.evidenceNotes)
            ? await decrypt(req.evidenceNotes)
            : req.evidenceNotes,
      })),
    );

    return NextResponse.json({
      assessment: {
        ...assessment,
        requirements: decryptedRequirements,
      },
    });
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

    const patchSchema = z.object({
      assessmentName: z.string().optional(),
      organizationSize: z
        .enum(["micro", "small", "medium", "large"])
        .optional(),
      employeeCount: z.number().optional(),
      annualRevenue: z.number().optional(),
      spaceSegmentComplexity: z
        .enum([
          "ground_only",
          "single_satellite",
          "small_constellation",
          "large_constellation",
        ])
        .optional(),
      satelliteCount: z.number().optional(),
      hasGroundSegment: z.boolean().optional(),
      groundStationCount: z.number().optional(),
      dataSensitivityLevel: z
        .enum(["public", "internal", "confidential", "classified"])
        .optional(),
      processesPersonalData: z.boolean().optional(),
      handlesGovData: z.boolean().optional(),
      existingCertifications: z.array(z.string()).optional(),
      hasSecurityTeam: z.boolean().optional(),
      securityTeamSize: z.number().optional(),
      hasIncidentResponsePlan: z.boolean().optional(),
      hasBCP: z.boolean().optional(),
      criticalSupplierCount: z.number().optional(),
      supplierSecurityAssessed: z.boolean().optional(),
      // maturityScore is server-calculated only — not accepted from client input
    });

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

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

    if (parsed.data.assessmentName !== undefined)
      updateData.assessmentName = parsed.data.assessmentName;
    if (parsed.data.organizationSize !== undefined)
      updateData.organizationSize = parsed.data.organizationSize;
    if (parsed.data.employeeCount !== undefined)
      updateData.employeeCount = parsed.data.employeeCount;
    if (parsed.data.annualRevenue !== undefined)
      updateData.annualRevenue = parsed.data.annualRevenue;
    if (parsed.data.spaceSegmentComplexity !== undefined)
      updateData.spaceSegmentComplexity = parsed.data.spaceSegmentComplexity;
    if (parsed.data.satelliteCount !== undefined)
      updateData.satelliteCount = parsed.data.satelliteCount;
    if (parsed.data.hasGroundSegment !== undefined)
      updateData.hasGroundSegment = parsed.data.hasGroundSegment;
    if (parsed.data.groundStationCount !== undefined)
      updateData.groundStationCount = parsed.data.groundStationCount;
    if (parsed.data.dataSensitivityLevel !== undefined)
      updateData.dataSensitivityLevel = parsed.data.dataSensitivityLevel;
    if (parsed.data.processesPersonalData !== undefined)
      updateData.processesPersonalData = parsed.data.processesPersonalData;
    if (parsed.data.handlesGovData !== undefined)
      updateData.handlesGovData = parsed.data.handlesGovData;
    if (parsed.data.existingCertifications !== undefined)
      updateData.existingCertifications = JSON.stringify(
        parsed.data.existingCertifications,
      );
    if (parsed.data.hasSecurityTeam !== undefined)
      updateData.hasSecurityTeam = parsed.data.hasSecurityTeam;
    if (parsed.data.securityTeamSize !== undefined)
      updateData.securityTeamSize = parsed.data.securityTeamSize;
    if (parsed.data.hasIncidentResponsePlan !== undefined)
      updateData.hasIncidentResponsePlan = parsed.data.hasIncidentResponsePlan;
    if (parsed.data.hasBCP !== undefined)
      updateData.hasBCP = parsed.data.hasBCP;
    if (parsed.data.criticalSupplierCount !== undefined)
      updateData.criticalSupplierCount = parsed.data.criticalSupplierCount;
    if (parsed.data.supplierSecurityAssessed !== undefined)
      updateData.supplierSecurityAssessed =
        parsed.data.supplierSecurityAssessed;

    // Recalculate simplified regime if profile changed
    const profileFields = [
      "organizationSize",
      "spaceSegmentComplexity",
      "processesPersonalData",
      "handlesGovData",
      "satelliteCount",
    ] as const;
    const profileChanged = profileFields.some(
      (f) => parsed.data[f] !== undefined,
    );

    if (profileChanged) {
      // Build new profile
      const profile: CybersecurityProfile = {
        organizationSize: (parsed.data.organizationSize ||
          existing.organizationSize) as OrganizationSize,
        employeeCount:
          parsed.data.employeeCount ?? existing.employeeCount ?? undefined,
        annualRevenue:
          parsed.data.annualRevenue ?? existing.annualRevenue ?? undefined,
        spaceSegmentComplexity: (parsed.data.spaceSegmentComplexity ||
          existing.spaceSegmentComplexity) as SpaceSegmentComplexity,
        satelliteCount:
          parsed.data.satelliteCount ?? existing.satelliteCount ?? undefined,
        hasGroundSegment:
          parsed.data.hasGroundSegment ?? existing.hasGroundSegment,
        groundStationCount:
          parsed.data.groundStationCount ??
          existing.groundStationCount ??
          undefined,
        dataSensitivityLevel: (parsed.data.dataSensitivityLevel ||
          existing.dataSensitivityLevel) as DataSensitivityLevel,
        processesPersonalData:
          parsed.data.processesPersonalData ?? existing.processesPersonalData,
        handlesGovData: parsed.data.handlesGovData ?? existing.handlesGovData,
        existingCertifications:
          parsed.data.existingCertifications ||
          safeJsonParseArray<string>(existing.existingCertifications),
        hasSecurityTeam:
          parsed.data.hasSecurityTeam ?? existing.hasSecurityTeam,
        securityTeamSize:
          parsed.data.securityTeamSize ??
          existing.securityTeamSize ??
          undefined,
        hasIncidentResponsePlan:
          parsed.data.hasIncidentResponsePlan ??
          existing.hasIncidentResponsePlan,
        hasBCP: parsed.data.hasBCP ?? existing.hasBCP,
        criticalSupplierCount:
          parsed.data.criticalSupplierCount ??
          existing.criticalSupplierCount ??
          undefined,
        supplierSecurityAssessed:
          parsed.data.supplierSecurityAssessed ??
          existing.supplierSecurityAssessed,
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
      newValue: parsed.data,
      description: "Updated cybersecurity assessment profile",
      ipAddress,
      userAgent,
    });

    // Decrypt sensitive fields in requirements for response
    const decryptedUpdatedRequirements = await Promise.all(
      updated.requirements.map(async (req) => ({
        ...req,
        notes:
          req.notes && isEncrypted(req.notes)
            ? await decrypt(req.notes)
            : req.notes,
        evidenceNotes:
          req.evidenceNotes && isEncrypted(req.evidenceNotes)
            ? await decrypt(req.evidenceNotes)
            : req.evidenceNotes,
      })),
    );

    return NextResponse.json({
      assessment: {
        ...updated,
        requirements: decryptedUpdatedRequirements,
      },
    });
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
