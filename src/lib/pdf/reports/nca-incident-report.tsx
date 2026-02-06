import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

/**
 * NCA Incident Report Data Structure
 */
export interface NCAIncidentReportData {
  // Header info
  incidentNumber: string;
  reportDate: Date;
  organization?: string;
  generatedBy: string;

  // Incident overview
  title: string;
  category: string;
  categoryDescription: string;
  severity: string;
  status: string;
  articleReference: string;

  // Timeline
  detectedAt: Date;
  detectedBy: string;
  detectionMethod: string;
  containedAt?: Date;
  resolvedAt?: Date;

  // Description
  description: string;
  rootCause?: string;
  impactAssessment?: string;

  // Affected assets
  affectedAssets: Array<{
    name: string;
    cosparId?: string;
    noradId?: string;
  }>;

  // Response actions
  immediateActions: string[];
  containmentMeasures: string[];
  resolutionSteps: string[];
  lessonsLearned?: string;

  // NCA notification
  requiresNCANotification: boolean;
  ncaDeadlineHours: number;
  reportedToNCA: boolean;
  ncaReportDate?: Date;
  ncaReferenceNumber?: string;
  reportedToEUSPA: boolean;

  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactRole?: string;
}

/**
 * Build report configuration from incident data
 */
export function buildNCAIncidentReportConfig(
  data: NCAIncidentReportData,
): ReportConfig {
  const sections: ReportSection[] = [];

  // 1. Incident Overview Section
  sections.push({
    title: "1. Incident Overview",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Incident Number", value: data.incidentNumber },
          { key: "Title", value: data.title },
          {
            key: "Category",
            value: `${data.category} - ${data.categoryDescription}`,
          },
          { key: "Severity", value: data.severity.toUpperCase() },
          { key: "Current Status", value: data.status },
          { key: "Article Reference", value: data.articleReference },
        ],
      },
    ],
  });

  // 2. Timeline Section
  const timelineItems = [
    {
      key: "Detection Time",
      value: data.detectedAt.toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    },
    { key: "Detected By", value: data.detectedBy },
    { key: "Detection Method", value: data.detectionMethod },
  ];

  if (data.containedAt) {
    timelineItems.push({
      key: "Contained At",
      value: data.containedAt.toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    });
  }

  if (data.resolvedAt) {
    timelineItems.push({
      key: "Resolved At",
      value: data.resolvedAt.toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    });
  }

  sections.push({
    title: "2. Timeline",
    content: [{ type: "keyValue", items: timelineItems }],
  });

  // 3. Incident Description Section
  const descriptionContent: ReportSection["content"] = [
    { type: "heading", value: "Summary", level: 3 },
    { type: "text", value: data.description },
  ];

  if (data.rootCause) {
    descriptionContent.push(
      { type: "spacer", height: 10 },
      { type: "heading", value: "Root Cause Analysis", level: 3 },
      { type: "text", value: data.rootCause },
    );
  }

  if (data.impactAssessment) {
    descriptionContent.push(
      { type: "spacer", height: 10 },
      { type: "heading", value: "Impact Assessment", level: 3 },
      { type: "text", value: data.impactAssessment },
    );
  }

  sections.push({
    title: "3. Incident Description",
    content: descriptionContent,
  });

  // 4. Affected Assets Section
  if (data.affectedAssets.length > 0) {
    sections.push({
      title: "4. Affected Assets",
      content: [
        {
          type: "table",
          headers: ["Asset Name", "COSPAR ID", "NORAD ID"],
          rows: data.affectedAssets.map((asset) => [
            asset.name,
            asset.cosparId || "N/A",
            asset.noradId || "N/A",
          ]),
        },
      ],
    });
  }

  // 5. Response Actions Section
  const responseContent: ReportSection["content"] = [];

  if (data.immediateActions.length > 0) {
    responseContent.push(
      { type: "heading", value: "Immediate Actions Taken", level: 3 },
      { type: "list", items: data.immediateActions, ordered: true },
    );
  }

  if (data.containmentMeasures.length > 0) {
    responseContent.push(
      { type: "heading", value: "Containment Measures", level: 3 },
      { type: "list", items: data.containmentMeasures, ordered: true },
    );
  }

  if (data.resolutionSteps.length > 0) {
    responseContent.push(
      { type: "heading", value: "Resolution Steps", level: 3 },
      { type: "list", items: data.resolutionSteps, ordered: true },
    );
  }

  if (data.lessonsLearned) {
    responseContent.push(
      { type: "heading", value: "Lessons Learned", level: 3 },
      { type: "text", value: data.lessonsLearned },
    );
  }

  if (responseContent.length > 0) {
    sections.push({
      title: "5. Response Actions",
      content: responseContent,
    });
  }

  // 6. Regulatory Compliance Section
  const complianceContent: ReportSection["content"] = [];

  if (data.requiresNCANotification) {
    const deadline = new Date(data.detectedAt);
    deadline.setHours(deadline.getHours() + data.ncaDeadlineHours);

    complianceContent.push({
      type: "alert",
      severity: data.reportedToNCA ? "info" : "warning",
      message: data.reportedToNCA
        ? `NCA notification completed on ${data.ncaReportDate?.toLocaleDateString("en-GB")}`
        : `NCA notification required within ${data.ncaDeadlineHours} hours of detection (deadline: ${deadline.toLocaleString("en-GB")})`,
    });
  }

  complianceContent.push({
    type: "keyValue",
    items: [
      {
        key: "NCA Notification Required",
        value: data.requiresNCANotification ? "Yes" : "No",
      },
      {
        key: "Notification Deadline",
        value: `${data.ncaDeadlineHours} hours from detection`,
      },
      { key: "Reported to NCA", value: data.reportedToNCA ? "Yes" : "Pending" },
      {
        key: "NCA Reference Number",
        value: data.ncaReferenceNumber || "Not yet assigned",
      },
      { key: "Reported to EUSPA", value: data.reportedToEUSPA ? "Yes" : "No" },
    ],
  });

  sections.push({
    title: "6. Regulatory Compliance",
    content: complianceContent,
  });

  // 7. Contact Information Section
  if (data.contactName || data.contactEmail) {
    sections.push({
      title: "7. Designated Contact",
      content: [
        {
          type: "keyValue",
          items: [
            { key: "Name", value: data.contactName || "Not specified" },
            { key: "Role", value: data.contactRole || "Not specified" },
            { key: "Email", value: data.contactEmail || "Not specified" },
            { key: "Phone", value: data.contactPhone || "Not specified" },
          ],
        },
      ],
    });
  }

  return {
    metadata: {
      reportId: data.incidentNumber,
      reportType: "incident",
      title: `NCA Incident Report - ${data.incidentNumber}`,
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization,
    },
    header: {
      title: "NCA Incident Report",
      subtitle: `EU Space Act Incident Notification`,
      reportNumber: data.incidentNumber,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "OFFICIAL - SENSITIVE",
      disclaimer:
        "This report is generated for regulatory compliance purposes under the EU Space Act. " +
        "All information contained herein is accurate to the best of our knowledge at the time of generation.",
    },
    sections,
  };
}

/**
 * NCA Incident Report Component
 */
export function NCAIncidentReport({ data }: { data: NCAIncidentReportData }) {
  const config = buildNCAIncidentReportConfig(data);
  return <BaseReport config={config} />;
}
