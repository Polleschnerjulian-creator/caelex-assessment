import React from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  AuthorizationApplicationPDF,
  type AuthorizationApplicationData,
} from "@/lib/pdf/reports/authorization-application";

// POST /api/authorization/application/pdf - Generate Authorization Application PDF
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 },
      );
    }

    // Get authorization workflow
    const workflow = await prisma.authorizationWorkflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
      include: {
        documents: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Authorization workflow not found" },
        { status: 404 },
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, organization: true },
    });

    // Get organization if exists
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
    });

    // Get related assessments
    const [debrisAssessment, cybersecurityAssessment, insuranceAssessment] =
      await Promise.all([
        prisma.debrisAssessment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.cybersecurityAssessment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.insuranceAssessment.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const orgName =
      orgMember?.organization?.name ||
      user?.organization ||
      user?.name ||
      "Unknown Organization";
    const generatedBy = user?.name || user?.email || "System";

    // Build PDF data with sensible defaults
    const pdfData: AuthorizationApplicationData = {
      reportNumber: `AUTH-${workflow.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      reportDate: new Date(),
      organization: orgName,
      generatedBy,

      applicationType: "new",
      applicationCategory: "Standard Authorization",

      applicant: {
        legalName: orgName,
        registrationNumber: "To be provided",
        incorporationDate: "To be provided",
        jurisdiction: workflow.primaryNCAName || workflow.primaryNCA || "EU",
        registeredAddress: "To be provided in final application",
        contactPerson: user?.name || "To be designated",
        contactEmail: user?.email || "To be provided",
        contactPhone: "To be provided",
      },

      operatorQualification: {
        operatorType: workflow.operatorType || "Spacecraft Operator",
        entitySize: "SME",
        isResearchEntity: false,
        lightRegimeEligible: false,
        previousAuthorizations: [],
        relevantExperience: [
          "Space systems development experience",
          "Satellite operations capability",
          "Mission control infrastructure",
        ],
        technicalCapabilities: [
          "Spacecraft design and integration",
          "Mission operations center",
          "Ground segment infrastructure",
          "Trained operations personnel",
        ],
      },

      missionDetails: {
        missionName: "To be specified",
        missionObjective: "To be detailed in final application",
        missionType: "Commercial",
        operationalConcept:
          "Detailed operational concept to be provided with technical dossier",
        plannedLaunchDate:
          workflow.targetSubmission?.toISOString().split("T")[0] ||
          "To be determined",
        missionDurationYears: 5,
        endOfMissionDate: "To be determined",
      },

      spaceSegment: {
        spacecraftCount: 1,
        spacecraftType: "Small Satellite",
        massKg: 0,
        orbitType: "LEO",
        altitudeKm: 500,
        inclinationDeg: 97,
        expectedLifetimeYears: 5,
        hasPropulsion: false,
        payloads: ["To be specified"],
      },

      groundSegment: {
        controlCenterLocation: "To be specified",
        groundStations: ["To be specified"],
        cybersecurityMeasures: [
          "Encrypted communications",
          "Access control systems",
          "Intrusion detection",
          "Secure software development",
        ],
      },

      launchDetails: {
        launchProvider: "To be determined",
        launchVehicle: "To be determined",
        launchSite: workflow.launchCountry || "To be determined",
        launchContract: "planning",
        deploymentMethod: "Direct injection",
      },

      complianceDocumentation: {
        debrisMitigationPlan: debrisAssessment?.planGenerated
          ? "attached"
          : "pending",
        insuranceCertificate: "pending",
        cybersecurityAssessment: cybersecurityAssessment
          ? "attached"
          : "pending",
        environmentalAssessment: "pending",
        frequencyCoordination: "pending",
        financialStatements: "pending",
        technicalDossier: "pending",
      },

      regulatoryRequirements: [
        {
          article: "Art. 7",
          requirement: "Authorization application submitted",
          complianceStatus: "in_progress",
          evidence: "This application document",
        },
        {
          article: "Art. 8",
          requirement: "Operator qualification demonstrated",
          complianceStatus: "planned",
        },
        {
          article: "Art. 12",
          requirement: "Debris mitigation plan",
          complianceStatus: debrisAssessment ? "in_progress" : "planned",
        },
        {
          article: "Art. 13",
          requirement: "Cybersecurity measures",
          complianceStatus: cybersecurityAssessment ? "in_progress" : "planned",
        },
        {
          article: "Art. 15",
          requirement: "Insurance coverage",
          complianceStatus: insuranceAssessment ? "in_progress" : "planned",
        },
      ],

      euSpaceActChecklist: [
        {
          category: "Art. 7-9: Authorization Requirements",
          items: [
            {
              requirement: "Applicant established in EU Member State",
              articleRef: "Art. 7(1)",
              status: "partial" as const,
              notes:
                "Jurisdiction: " +
                (workflow.primaryNCAName || workflow.primaryNCA),
            },
            {
              requirement: "Technical & financial capability",
              articleRef: "Art. 8(1)",
              status: "partial" as const,
              notes: "Documentation required",
            },
            {
              requirement: "Mission described in detail",
              articleRef: "Art. 7(2)",
              status: "partial" as const,
              notes: "To be completed",
            },
          ],
        },
        {
          category: "Art. 12-15: Compliance Requirements",
          items: [
            {
              requirement: "Debris mitigation plan",
              articleRef: "Art. 12",
              status: debrisAssessment?.planGenerated
                ? ("yes" as const)
                : ("partial" as const),
            },
            {
              requirement: "Cybersecurity assessment",
              articleRef: "Art. 13",
              status: cybersecurityAssessment
                ? ("yes" as const)
                : ("no" as const),
            },
            {
              requirement: "Insurance coverage",
              articleRef: "Art. 15",
              status: insuranceAssessment
                ? ("partial" as const)
                : ("no" as const),
            },
          ],
        },
      ],

      declarations: {
        accuracyDeclaration: true,
        complianceCommitment: true,
        changeNotificationCommitment: true,
        supervisoryCooperation: true,
        dataProtectionCompliance: true,
        sanctionsCompliance: true,
      },
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <AuthorizationApplicationPDF data={pdfData} />,
    );

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "authorization_application_pdf_generated",
      entityType: "authorization_workflow",
      entityId: workflowId,
      newValue: { reportNumber: pdfData.reportNumber },
      description: "Generated Authorization Application PDF",
      ipAddress,
      userAgent,
    });

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Authorization-Application-${pdfData.reportNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating authorization application PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
