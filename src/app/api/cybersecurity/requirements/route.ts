import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { safeJsonParseArray } from "@/lib/validations";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import {
  cybersecurityRequirements,
  getApplicableRequirements,
  calculateMaturityScore,
  type CybersecurityProfile,
  type OrganizationSize,
  type SpaceSegmentComplexity,
  type DataSensitivityLevel,
  type RequirementStatus,
} from "@/data/cybersecurity-requirements";

// GET /api/cybersecurity/requirements - Get requirements for an assessment
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
      // Return all requirements for reference
      return NextResponse.json({ requirements: cybersecurityRequirements });
    }

    // Verify assessment ownership
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

    // Build profile from assessment
    const profile: CybersecurityProfile = {
      organizationSize: assessment.organizationSize as OrganizationSize,
      employeeCount: assessment.employeeCount ?? undefined,
      annualRevenue: assessment.annualRevenue ?? undefined,
      spaceSegmentComplexity:
        assessment.spaceSegmentComplexity as SpaceSegmentComplexity,
      satelliteCount: assessment.satelliteCount ?? undefined,
      hasGroundSegment: assessment.hasGroundSegment,
      groundStationCount: assessment.groundStationCount ?? undefined,
      dataSensitivityLevel:
        assessment.dataSensitivityLevel as DataSensitivityLevel,
      processesPersonalData: assessment.processesPersonalData,
      handlesGovData: assessment.handlesGovData,
      existingCertifications: safeJsonParseArray<string>(
        assessment.existingCertifications,
      ),
      hasSecurityTeam: assessment.hasSecurityTeam,
      securityTeamSize: assessment.securityTeamSize ?? undefined,
      hasIncidentResponsePlan: assessment.hasIncidentResponsePlan,
      hasBCP: assessment.hasBCP,
      criticalSupplierCount: assessment.criticalSupplierCount ?? undefined,
      supplierSecurityAssessed: assessment.supplierSecurityAssessed,
    };

    // Get applicable requirements
    const applicable = getApplicableRequirements(profile);

    // Merge with status data and decrypt sensitive fields
    const requirementsWithStatus = await Promise.all(
      applicable.map(async (req) => {
        const statusRecord = assessment.requirements.find(
          (r) => r.requirementId === req.id,
        );

        // Decrypt notes and evidenceNotes if encrypted
        let notes = statusRecord?.notes || null;
        let evidenceNotes = statusRecord?.evidenceNotes || null;
        if (notes && isEncrypted(notes)) {
          try {
            notes = await decrypt(notes);
          } catch {
            // Keep encrypted value if decryption fails
          }
        }
        if (evidenceNotes && isEncrypted(evidenceNotes)) {
          try {
            evidenceNotes = await decrypt(evidenceNotes);
          } catch {
            // Keep encrypted value if decryption fails
          }
        }

        return {
          ...req,
          status: statusRecord?.status || "not_assessed",
          notes,
          evidenceNotes,
          targetDate: statusRecord?.targetDate || null,
          statusId: statusRecord?.id || null,
        };
      }),
    );

    return NextResponse.json({
      requirements: requirementsWithStatus,
      assessment: {
        id: assessment.id,
        assessmentName: assessment.assessmentName,
        organizationSize: assessment.organizationSize,
        isSimplifiedRegime: assessment.isSimplifiedRegime,
        maturityScore: assessment.maturityScore,
      },
    });
  } catch (error) {
    console.error("Error fetching cybersecurity requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/cybersecurity/requirements - Update requirement status
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
      requirementId,
      status,
      notes,
      evidenceNotes,
      targetDate,
    } = body;

    if (!assessmentId || !requirementId) {
      return NextResponse.json(
        {
          error: "assessmentId and requirementId are required",
        },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const assessment = await prisma.cybersecurityAssessment.findFirst({
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
    const previous = await prisma.cybersecurityRequirementStatus.findUnique({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
    });

    // Encrypt sensitive text fields before storage
    const encryptedNotes =
      notes !== undefined && notes !== null ? await encrypt(notes) : notes;
    const encryptedEvidenceNotes =
      evidenceNotes !== undefined && evidenceNotes !== null
        ? await encrypt(evidenceNotes)
        : evidenceNotes;

    // Upsert requirement status
    const updated = await prisma.cybersecurityRequirementStatus.upsert({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
      update: {
        status: status ?? undefined,
        notes: encryptedNotes ?? undefined,
        evidenceNotes: encryptedEvidenceNotes ?? undefined,
        targetDate: targetDate ? new Date(targetDate) : undefined,
      },
      create: {
        assessmentId,
        requirementId,
        status: status || "not_assessed",
        notes: encryptedNotes,
        evidenceNotes: encryptedEvidenceNotes,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });

    // Recalculate maturity score
    const allStatuses = await prisma.cybersecurityRequirementStatus.findMany({
      where: { assessmentId },
    });

    // Build profile for requirements
    const profile: CybersecurityProfile = {
      organizationSize: assessment.organizationSize as OrganizationSize,
      employeeCount: assessment.employeeCount ?? undefined,
      annualRevenue: assessment.annualRevenue ?? undefined,
      spaceSegmentComplexity:
        assessment.spaceSegmentComplexity as SpaceSegmentComplexity,
      satelliteCount: assessment.satelliteCount ?? undefined,
      hasGroundSegment: assessment.hasGroundSegment,
      groundStationCount: assessment.groundStationCount ?? undefined,
      dataSensitivityLevel:
        assessment.dataSensitivityLevel as DataSensitivityLevel,
      processesPersonalData: assessment.processesPersonalData,
      handlesGovData: assessment.handlesGovData,
      existingCertifications: safeJsonParseArray<string>(
        assessment.existingCertifications,
      ),
      hasSecurityTeam: assessment.hasSecurityTeam,
      securityTeamSize: assessment.securityTeamSize ?? undefined,
      hasIncidentResponsePlan: assessment.hasIncidentResponsePlan,
      hasBCP: assessment.hasBCP,
      criticalSupplierCount: assessment.criticalSupplierCount ?? undefined,
      supplierSecurityAssessed: assessment.supplierSecurityAssessed,
    };

    const applicableRequirements = getApplicableRequirements(profile);
    const statusMap: Record<string, RequirementStatus> = {};
    allStatuses.forEach((s) => {
      statusMap[s.requirementId] = s.status as RequirementStatus;
    });

    const maturityScore = calculateMaturityScore(
      applicableRequirements,
      statusMap,
    );

    await prisma.cybersecurityAssessment.update({
      where: { id: assessmentId },
      data: { maturityScore },
    });

    // Log audit event if status changed
    if (!previous || previous.status !== status) {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId,
        action: "cybersecurity_requirement_status_changed",
        entityType: "cybersecurity_requirement",
        entityId: requirementId,
        previousValue: previous ? { status: previous.status } : null,
        newValue: { status },
        description: `Changed requirement "${requirementId}" status to "${status}"`,
        ipAddress,
        userAgent,
      });
    }

    // Decrypt sensitive fields for response
    const decryptedUpdated = {
      ...updated,
      notes:
        updated.notes && isEncrypted(updated.notes)
          ? await decrypt(updated.notes)
          : updated.notes,
      evidenceNotes:
        updated.evidenceNotes && isEncrypted(updated.evidenceNotes)
          ? await decrypt(updated.evidenceNotes)
          : updated.evidenceNotes,
    };

    return NextResponse.json({
      requirementStatus: decryptedUpdated,
      maturityScore,
    });
  } catch (error) {
    console.error("Error updating cybersecurity requirement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
