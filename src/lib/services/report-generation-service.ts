/**
 * Report Generation Service
 *
 * Handles PDF report generation for NCA submissions
 */

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  NCAIncidentReport,
  type NCAIncidentReportData,
} from "@/lib/pdf/reports/nca-incident-report";
import {
  NCAAnnualComplianceReport,
  type NCAAnnualComplianceReportData,
} from "@/lib/pdf/reports/nca-annual-compliance-report";
import {
  NCASignificantChangeReport,
  getChangeTypeInfo,
  type NCASignificantChangeReportData,
} from "@/lib/pdf/reports/nca-significant-change-report";
import type { ReportType } from "@/lib/pdf/types";

// ============================================================================
// Types
// ============================================================================

export type GenerateReportType =
  | "incident"
  | "annual_compliance"
  | "significant_change";

export interface GenerateIncidentReportOptions {
  type: "incident";
  incidentId: string;
  userId: string;
  includeResolutionDetails?: boolean;
}

export interface GenerateAnnualComplianceReportOptions {
  type: "annual_compliance";
  supervisionId: string;
  reportYear: string;
  userId: string;
}

export interface GenerateSignificantChangeReportOptions {
  type: "significant_change";
  workflowId: string;
  changeType: NCASignificantChangeReportData["changeType"];
  changeData: {
    title: string;
    description: string;
    justification: string;
    effectiveDate: Date;
    currentState: { field: string; value: string }[];
    proposedState: { field: string; value: string }[];
    impactAssessment: NCASignificantChangeReportData["impactAssessment"];
    impactDescription?: string;
    mitigationMeasures?: string[];
    ownershipTransfer?: NCASignificantChangeReportData["ownershipTransfer"];
  };
  userId: string;
}

export type GenerateReportOptions =
  | GenerateIncidentReportOptions
  | GenerateAnnualComplianceReportOptions
  | GenerateSignificantChangeReportOptions;

export interface GeneratedReport {
  buffer: Buffer;
  filename: string;
  contentType: string;
  reportId: string;
  reportType: ReportType;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    organization?: string;
  };
}

export interface ReportGenerationError {
  success: false;
  error: string;
  code: "NOT_FOUND" | "INVALID_DATA" | "GENERATION_FAILED" | "UNAUTHORIZED";
}

export type ReportGenerationResult =
  | { success: true; report: GeneratedReport }
  | ReportGenerationError;

// ============================================================================
// Incident Category Mapping
// ============================================================================

const INCIDENT_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  loss_of_contact: "Loss of Contact with Spacecraft",
  debris_generation: "Debris Generation Event",
  cyber_incident: "Cybersecurity Incident",
  spacecraft_anomaly: "Spacecraft Anomaly",
  conjunction_event: "Conjunction/Collision Risk Event",
  regulatory_breach: "Regulatory Breach",
  other: "Other Incident",
};

const INCIDENT_ARTICLE_REFERENCES: Record<string, string> = {
  loss_of_contact: "EU Space Act Art. 34, 79",
  debris_generation: "EU Space Act Art. 55-73",
  cyber_incident: "EU Space Act Art. 74-95, NIS2 Directive",
  spacecraft_anomaly: "EU Space Act Art. 34, 37",
  conjunction_event: "EU Space Act Art. 55-73",
  regulatory_breach: "EU Space Act Art. 33-54",
  other: "EU Space Act Art. 34",
};

const NCA_DEADLINE_HOURS: Record<string, number> = {
  loss_of_contact: 4,
  debris_generation: 4,
  cyber_incident: 4,
  spacecraft_anomaly: 24,
  conjunction_event: 72,
  regulatory_breach: 72,
  other: 168,
};

// ============================================================================
// Report Generation Functions
// ============================================================================

/**
 * Generate a report based on type and options
 */
export async function generateReport(
  options: GenerateReportOptions,
): Promise<ReportGenerationResult> {
  try {
    switch (options.type) {
      case "incident":
        return await generateIncidentReport(options);
      case "annual_compliance":
        return await generateAnnualComplianceReport(options);
      case "significant_change":
        return await generateSignificantChangeReport(options);
      default:
        return {
          success: false,
          error: "Unknown report type",
          code: "INVALID_DATA",
        };
    }
  } catch (error) {
    console.error("Report generation failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Report generation failed",
      code: "GENERATION_FAILED",
    };
  }
}

/**
 * Generate NCA Incident Report
 */
async function generateIncidentReport(
  options: GenerateIncidentReportOptions,
): Promise<ReportGenerationResult> {
  const { incidentId, userId, includeResolutionDetails = true } = options;

  // Fetch incident with related data
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      supervision: {
        include: {
          user: {
            select: {
              organization: true,
              name: true,
              email: true,
            },
          },
        },
      },
      affectedAssets: true,
    },
  });

  if (!incident) {
    return {
      success: false,
      error: "Incident not found",
      code: "NOT_FOUND",
    };
  }

  // Get user for generatedBy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const organization =
    incident.supervision.user.organization || "Unknown Organization";

  // Build report data
  const reportData: NCAIncidentReportData = {
    incidentNumber: incident.incidentNumber,
    reportDate: new Date(),
    organization,
    generatedBy: user?.name || user?.email || "System",

    title: incident.title,
    category: incident.category,
    categoryDescription:
      INCIDENT_CATEGORY_DESCRIPTIONS[incident.category] || incident.category,
    severity: incident.severity,
    status: incident.status,
    articleReference:
      INCIDENT_ARTICLE_REFERENCES[incident.category] || "EU Space Act",

    detectedAt: incident.detectedAt,
    detectedBy: incident.detectedBy || "Automated Monitoring",
    detectionMethod: incident.detectionMethod || "System Detection",
    containedAt: incident.containedAt || undefined,
    resolvedAt: incident.resolvedAt || undefined,

    description: incident.description,
    rootCause: includeResolutionDetails
      ? incident.rootCause || undefined
      : undefined,
    impactAssessment: incident.impactAssessment || undefined,

    affectedAssets: incident.affectedAssets.map((aa) => ({
      name: aa.assetName,
      cosparId: aa.cosparId || undefined,
      noradId: aa.noradId || undefined,
    })),

    immediateActions: incident.immediateActions || [],
    containmentMeasures: incident.containmentMeasures || [],
    resolutionSteps: includeResolutionDetails
      ? incident.resolutionSteps || []
      : [],
    lessonsLearned: includeResolutionDetails
      ? incident.lessonsLearned || undefined
      : undefined,

    requiresNCANotification: incident.requiresNCANotification,
    ncaDeadlineHours: NCA_DEADLINE_HOURS[incident.category] || 72,
    reportedToNCA: incident.reportedToNCA,
    ncaReportDate: incident.ncaReportDate || undefined,
    ncaReferenceNumber: incident.ncaReferenceNumber || undefined,
    reportedToEUSPA: incident.reportedToEUSPA,

    contactName: incident.supervision.designatedContactName || undefined,
    contactEmail: incident.supervision.designatedContactEmail || undefined,
    contactPhone: incident.supervision.designatedContactPhone || undefined,
    contactRole: incident.supervision.designatedContactRole || undefined,
  };

  // Generate PDF
  const element = React.createElement(NCAIncidentReport, { data: reportData });
  const buffer = await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0],
  );

  // Create report record in database
  const reportRecord = await prisma.supervisionReport.create({
    data: {
      supervisionId: incident.supervisionId,
      reportType: "incident",
      title: `NCA Incident Report - ${incident.incidentNumber}`,
      status: "generated",
      generatedAt: new Date(),
      generatedBy: userId,
      incidentId: incident.id,
      metadata: {
        incidentNumber: incident.incidentNumber,
        category: incident.category,
        severity: incident.severity,
      },
    },
  });

  // Audit log
  await logAuditEvent({
    action: "report.generated",
    userId,
    entityType: "SupervisionReport",
    entityId: reportRecord.id,
    newValue: {
      reportType: "incident",
      incidentId,
      incidentNumber: incident.incidentNumber,
    },
  });

  const filename = `NCA-Incident-Report-${incident.incidentNumber}-${formatDateForFilename(new Date())}.pdf`;

  return {
    success: true,
    report: {
      buffer: Buffer.from(buffer),
      filename,
      contentType: "application/pdf",
      reportId: reportRecord.id,
      reportType: "incident",
      metadata: {
        generatedAt: new Date(),
        generatedBy: user?.name || userId,
        organization,
      },
    },
  };
}

/**
 * Generate NCA Annual Compliance Report
 */
async function generateAnnualComplianceReport(
  options: GenerateAnnualComplianceReportOptions,
): Promise<ReportGenerationResult> {
  const { supervisionId, reportYear, userId } = options;

  // Fetch supervision with all related data
  const supervision = await prisma.supervisionConfig.findUnique({
    where: { id: supervisionId },
    include: {
      user: {
        select: {
          organization: true,
          operatorType: true,
          name: true,
          email: true,
        },
      },
      incidents: {
        where: {
          detectedAt: {
            gte: new Date(`${reportYear}-01-01`),
            lt: new Date(`${parseInt(reportYear) + 1}-01-01`),
          },
        },
      },
    },
  });

  if (!supervision) {
    return {
      success: false,
      error: "Supervision record not found",
      code: "NOT_FOUND",
    };
  }

  // Get user for generatedBy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const organization = supervision.user.organization || "Unknown Organization";
  const operatorType = supervision.user.operatorType || "Spacecraft Operator";

  // Get related assessments for the year
  const [
    cybersecurityAssessments,
    environmentalAssessments,
    debrisAssessments,
    insuranceAssessments,
  ] = await Promise.all([
    prisma.cybersecurityAssessment.findMany({
      where: {
        userId: supervision.userId,
        createdAt: {
          gte: new Date(`${reportYear}-01-01`),
          lt: new Date(`${parseInt(reportYear) + 1}-01-01`),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.environmentalAssessment.findMany({
      where: {
        userId: supervision.userId,
        createdAt: {
          gte: new Date(`${reportYear}-01-01`),
          lt: new Date(`${parseInt(reportYear) + 1}-01-01`),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.debrisAssessment.findMany({
      where: {
        userId: supervision.userId,
        createdAt: {
          gte: new Date(`${reportYear}-01-01`),
          lt: new Date(`${parseInt(reportYear) + 1}-01-01`),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.insuranceAssessment.findMany({
      where: {
        userId: supervision.userId,
        createdAt: {
          gte: new Date(`${reportYear}-01-01`),
          lt: new Date(`${parseInt(reportYear) + 1}-01-01`),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
  ]);

  const cyberAssessment = cybersecurityAssessments[0];
  const efdAssessment = environmentalAssessments[0];
  const debrisAssessment = debrisAssessments[0];
  const insAssessment = insuranceAssessments[0];

  // Calculate compliance status
  const complianceChecks = {
    authorization: true, // Assume authorized if in system
    debris: debrisAssessment?.planGenerated === true,
    cybersecurity: cyberAssessment?.frameworkGeneratedAt !== null,
    insurance: insAssessment?.reportGenerated === true,
    efd: ["submitted", "approved"].includes(efdAssessment?.status || ""),
    reporting: true, // Assume compliant if generating report
  };

  const overallScore = Math.round(
    (Object.values(complianceChecks).filter(Boolean).length / 6) * 100,
  );

  // Categorize incidents
  const incidents = supervision.incidents;
  const incidentsSummary = {
    totalIncidents: incidents.length,
    criticalIncidents: incidents.filter((i) => i.severity === "critical")
      .length,
    highIncidents: incidents.filter((i) => i.severity === "high").length,
    mediumIncidents: incidents.filter((i) => i.severity === "medium").length,
    lowIncidents: incidents.filter((i) => i.severity === "low").length,
    resolvedIncidents: incidents.filter((i) => i.status === "resolved").length,
    ncaNotifications: incidents.filter((i) => i.reportedToNCA).length,
  };

  // Build report data
  const reportData: NCAAnnualComplianceReportData = {
    reportYear,
    reportDate: new Date(),
    organization,
    generatedBy: user?.name || user?.email || "System",
    operatorType,

    operatorDetails: {
      legalName: organization,
      primaryNCA: supervision.primaryCountry || "Not assigned",
    },

    fleetOverview: {
      totalSpacecraft: 0, // Would need spacecraft tracking
      activeSpacecraft: 0,
      decommissioned: 0,
      orbitalRegime: "Not specified",
      missionTypes: [],
    },

    complianceStatus: {
      overallScore,
      authorizationCompliant: complianceChecks.authorization,
      debrisCompliant: complianceChecks.debris,
      cybersecurityCompliant: complianceChecks.cybersecurity,
      insuranceCompliant: complianceChecks.insurance,
      efdCompliant: complianceChecks.efd,
      reportingCompliant: complianceChecks.reporting,
    },

    incidentsSummary,

    keyActivities: [],

    debrisMitigation: {
      passivationCompliance: debrisAssessment?.hasPassivationCap === true,
      deorbitCompliance: !!debrisAssessment?.deorbitStrategy,
      collisionAvoidanceManeuvers: 0,
      debrisGeneratingEvents: incidents.filter(
        (i) => i.category === "debris_generation",
      ).length,
    },

    cybersecurity: {
      incidentCount: incidents.filter((i) => i.category === "cyber_incident")
        .length,
      lastAssessmentDate: cyberAssessment?.createdAt || undefined,
      certifications: [],
    },

    insurance: {
      coverageAmount: 0,
      insurer: "Not specified",
    },

    environmental: {
      efdSubmitted: !!efdAssessment,
      totalGWP: undefined,
      efdGrade: undefined,
    },

    plannedActivities: [],

    contactName: supervision.designatedContactName || undefined,
    contactEmail: supervision.designatedContactEmail || undefined,
  };

  // Generate PDF
  const element = React.createElement(NCAAnnualComplianceReport, {
    data: reportData,
  });
  const buffer = await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0],
  );

  // Create report record in database
  const reportRecord = await prisma.supervisionReport.create({
    data: {
      supervisionId,
      reportType: "annual_compliance",
      reportPeriod: reportYear,
      title: `Annual Compliance Report ${reportYear}`,
      status: "generated",
      generatedAt: new Date(),
      generatedBy: userId,
      metadata: {
        reportYear,
        overallScore,
        organization,
      },
    },
  });

  // Audit log
  await logAuditEvent({
    action: "report.generated",
    userId,
    entityType: "SupervisionReport",
    entityId: reportRecord.id,
    newValue: {
      reportType: "annual_compliance",
      supervisionId,
      reportYear,
    },
  });

  const filename = `Annual-Compliance-Report-${reportYear}-${organization.replace(/\s+/g, "-")}.pdf`;

  return {
    success: true,
    report: {
      buffer: Buffer.from(buffer),
      filename,
      contentType: "application/pdf",
      reportId: reportRecord.id,
      reportType: "annual_compliance",
      metadata: {
        generatedAt: new Date(),
        generatedBy: user?.name || userId,
        organization,
      },
    },
  };
}

/**
 * Generate NCA Significant Change Report
 */
async function generateSignificantChangeReport(
  options: GenerateSignificantChangeReportOptions,
): Promise<ReportGenerationResult> {
  const { workflowId, changeType, changeData, userId } = options;

  // Fetch authorization workflow
  const workflow = await prisma.authorizationWorkflow.findUnique({
    where: { id: workflowId },
    include: {
      user: {
        select: {
          organization: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!workflow) {
    return {
      success: false,
      error: "Authorization workflow not found",
      code: "NOT_FOUND",
    };
  }

  // Get user for generatedBy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const organization = workflow.user.organization || "Unknown Organization";
  const changeInfo = getChangeTypeInfo(changeType);

  // Generate notification number
  const notificationNumber = `SCN-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  // Build report data
  const reportData: NCASignificantChangeReportData = {
    notificationNumber,
    reportDate: new Date(),
    organization,
    generatedBy: user?.name || user?.email || "System",

    authorizationNumber: workflow.id,
    authorizationDate: workflow.approvedAt || workflow.createdAt,
    primaryNCA:
      workflow.primaryNCAName || workflow.primaryNCA || "Not specified",

    changeType,
    changeTypeDescription: changeInfo.description,
    notificationDeadlineDays: changeInfo.deadlineDays,
    requiresPreApproval: changeInfo.requiresPreApproval,

    changeTitle: changeData.title,
    changeDescription: changeData.description,
    justification: changeData.justification,
    effectiveDate: changeData.effectiveDate,

    currentState: changeData.currentState,
    proposedState: changeData.proposedState,

    impactAssessment: changeData.impactAssessment,
    impactDescription: changeData.impactDescription,
    mitigationMeasures: changeData.mitigationMeasures,

    affectedSpacecraft: [], // Would be populated from workflow spacecraft

    ownershipTransfer: changeData.ownershipTransfer,

    contactName: user?.name || undefined,
    contactEmail: user?.email || undefined,
  };

  // Generate PDF
  const element = React.createElement(NCASignificantChangeReport, {
    data: reportData,
  });
  const buffer = await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0],
  );

  // Create report record in database
  const reportRecord = await prisma.supervisionReport.create({
    data: {
      supervisionId: workflow.userId, // Using userId as supervision reference
      reportType: "significant_change",
      title: `Significant Change Notification - ${notificationNumber}`,
      status: "generated",
      generatedAt: new Date(),
      generatedBy: userId,
      metadata: {
        notificationNumber,
        changeType,
        workflowId,
        requiresPreApproval: changeInfo.requiresPreApproval,
      },
    },
  });

  // Audit log
  await logAuditEvent({
    action: "report.generated",
    userId,
    entityType: "SupervisionReport",
    entityId: reportRecord.id,
    newValue: {
      reportType: "significant_change",
      workflowId,
      changeType,
      notificationNumber,
    },
  });

  const filename = `Significant-Change-${notificationNumber}-${formatDateForFilename(new Date())}.pdf`;

  return {
    success: true,
    report: {
      buffer: Buffer.from(buffer),
      filename,
      contentType: "application/pdf",
      reportId: reportRecord.id,
      reportType: "significant_change",
      metadata: {
        generatedAt: new Date(),
        generatedBy: user?.name || userId,
        organization,
      },
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateForFilename(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * List available report types
 */
export function getAvailableReportTypes(): Array<{
  type: GenerateReportType;
  name: string;
  description: string;
}> {
  return [
    {
      type: "incident",
      name: "NCA Incident Report",
      description:
        "Report for notifying NCAs of space incidents per EU Space Act Art. 34",
    },
    {
      type: "annual_compliance",
      name: "Annual Compliance Report",
      description: "Annual compliance summary per EU Space Act Art. 33-34",
    },
    {
      type: "significant_change",
      name: "Significant Change Notification",
      description:
        "Notification for significant changes to authorized operations per EU Space Act Art. 27",
    },
  ];
}

/**
 * Get report history for a supervision
 */
export async function getReportHistory(supervisionId: string): Promise<
  Array<{
    id: string;
    reportType: string;
    title: string | null;
    status: string;
    generatedAt: Date | null;
    generatedBy: string | null;
  }>
> {
  const reports = await prisma.supervisionReport.findMany({
    where: { supervisionId },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      reportType: true,
      title: true,
      status: true,
      generatedAt: true,
      generatedBy: true,
    },
  });

  return reports;
}
