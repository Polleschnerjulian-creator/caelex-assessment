import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

/**
 * NCA Annual Compliance Report Data Structure
 */
export interface NCAAnnualComplianceReportData {
  // Header info
  reportYear: string;
  reportDate: Date;
  organization: string;
  generatedBy: string;
  operatorType: string;

  // Operator information
  operatorDetails: {
    legalName: string;
    registrationNumber?: string;
    address?: string;
    primaryNCA: string;
    authorizationNumber?: string;
    authorizationDate?: Date;
  };

  // Fleet overview
  fleetOverview: {
    totalSpacecraft: number;
    activeSpacecraft: number;
    decommissioned: number;
    orbitalRegime: string;
    missionTypes: string[];
  };

  // Compliance status
  complianceStatus: {
    overallScore: number; // 0-100
    authorizationCompliant: boolean;
    debrisCompliant: boolean;
    cybersecurityCompliant: boolean;
    insuranceCompliant: boolean;
    efdCompliant: boolean;
    reportingCompliant: boolean;
  };

  // Incidents summary
  incidentsSummary: {
    totalIncidents: number;
    criticalIncidents: number;
    highIncidents: number;
    mediumIncidents: number;
    lowIncidents: number;
    resolvedIncidents: number;
    ncaNotifications: number;
  };

  // Key activities
  keyActivities: Array<{
    date: Date;
    activity: string;
    status: string;
  }>;

  // Debris mitigation
  debrisMitigation: {
    passivationCompliance: boolean;
    deorbitCompliance: boolean;
    collisionAvoidanceManeuvers: number;
    debrisGeneratingEvents: number;
  };

  // Cybersecurity
  cybersecurity: {
    incidentCount: number;
    lastAssessmentDate?: Date;
    certifications: string[];
  };

  // Insurance
  insurance: {
    coverageAmount: number;
    policyExpiry?: Date;
    insurer: string;
  };

  // Environmental
  environmental: {
    efdSubmitted: boolean;
    totalGWP?: number;
    efdGrade?: string;
  };

  // Next year plans
  plannedActivities: string[];

  // Contact
  contactName?: string;
  contactEmail?: string;
}

/**
 * Build report configuration from annual compliance data
 */
export function buildNCAAnnualComplianceReportConfig(
  data: NCAAnnualComplianceReportData,
): ReportConfig {
  const sections: ReportSection[] = [];

  // 1. Executive Summary
  const complianceGrade =
    data.complianceStatus.overallScore >= 90
      ? "Excellent"
      : data.complianceStatus.overallScore >= 75
        ? "Good"
        : data.complianceStatus.overallScore >= 60
          ? "Satisfactory"
          : "Requires Improvement";

  sections.push({
    title: "1. Executive Summary",
    content: [
      {
        type: "text",
        value: `This Annual Compliance Report summarizes ${data.organization}'s space operations and regulatory compliance status for the year ${data.reportYear}. Overall compliance performance is rated as "${complianceGrade}" with a score of ${data.complianceStatus.overallScore}%.`,
      },
      {
        type: "keyValue",
        items: [
          { key: "Reporting Period", value: data.reportYear },
          { key: "Operator Type", value: data.operatorType },
          { key: "Primary NCA", value: data.operatorDetails.primaryNCA },
          {
            key: "Overall Compliance Score",
            value: `${data.complianceStatus.overallScore}%`,
          },
        ],
      },
    ],
  });

  // 2. Operator Information
  sections.push({
    title: "2. Operator Information",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Legal Name", value: data.operatorDetails.legalName },
          {
            key: "Registration Number",
            value: data.operatorDetails.registrationNumber || "N/A",
          },
          { key: "Address", value: data.operatorDetails.address || "N/A" },
          {
            key: "Authorization Number",
            value: data.operatorDetails.authorizationNumber || "N/A",
          },
          {
            key: "Authorization Date",
            value: data.operatorDetails.authorizationDate
              ? data.operatorDetails.authorizationDate.toLocaleDateString(
                  "en-GB",
                )
              : "N/A",
          },
        ],
      },
    ],
  });

  // 3. Fleet Overview
  sections.push({
    title: "3. Fleet Overview",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Total Spacecraft",
            value: data.fleetOverview.totalSpacecraft.toString(),
          },
          {
            key: "Active",
            value: data.fleetOverview.activeSpacecraft.toString(),
          },
          {
            key: "Decommissioned",
            value: data.fleetOverview.decommissioned.toString(),
          },
          {
            key: "Primary Orbital Regime",
            value: data.fleetOverview.orbitalRegime,
          },
        ],
      },
      { type: "heading", value: "Mission Types", level: 3 },
      { type: "list", items: data.fleetOverview.missionTypes },
    ],
  });

  // 4. Compliance Status
  const complianceItems = [
    {
      key: "Authorization",
      value: data.complianceStatus.authorizationCompliant
        ? "✓ Compliant"
        : "✗ Non-Compliant",
    },
    {
      key: "Debris Mitigation",
      value: data.complianceStatus.debrisCompliant
        ? "✓ Compliant"
        : "✗ Non-Compliant",
    },
    {
      key: "Cybersecurity",
      value: data.complianceStatus.cybersecurityCompliant
        ? "✓ Compliant"
        : "✗ Non-Compliant",
    },
    {
      key: "Insurance",
      value: data.complianceStatus.insuranceCompliant
        ? "✓ Compliant"
        : "✗ Non-Compliant",
    },
    {
      key: "Environmental Footprint",
      value: data.complianceStatus.efdCompliant
        ? "✓ Compliant"
        : "✗ Non-Compliant",
    },
    {
      key: "Reporting Obligations",
      value: data.complianceStatus.reportingCompliant
        ? "✓ Compliant"
        : "✗ Non-Compliant",
    },
  ];

  sections.push({
    title: "4. Compliance Status",
    content: [
      {
        type: "alert",
        severity:
          data.complianceStatus.overallScore >= 75
            ? "info"
            : data.complianceStatus.overallScore >= 60
              ? "warning"
              : "error",
        message: `Overall compliance score: ${data.complianceStatus.overallScore}% - ${complianceGrade}`,
      },
      { type: "keyValue", items: complianceItems },
    ],
  });

  // 5. Incidents Summary
  sections.push({
    title: "5. Incidents Summary",
    content: [
      {
        type: "table",
        headers: ["Severity", "Count", "Percentage"],
        rows: [
          [
            "Critical",
            data.incidentsSummary.criticalIncidents.toString(),
            `${((data.incidentsSummary.criticalIncidents / Math.max(data.incidentsSummary.totalIncidents, 1)) * 100).toFixed(1)}%`,
          ],
          [
            "High",
            data.incidentsSummary.highIncidents.toString(),
            `${((data.incidentsSummary.highIncidents / Math.max(data.incidentsSummary.totalIncidents, 1)) * 100).toFixed(1)}%`,
          ],
          [
            "Medium",
            data.incidentsSummary.mediumIncidents.toString(),
            `${((data.incidentsSummary.mediumIncidents / Math.max(data.incidentsSummary.totalIncidents, 1)) * 100).toFixed(1)}%`,
          ],
          [
            "Low",
            data.incidentsSummary.lowIncidents.toString(),
            `${((data.incidentsSummary.lowIncidents / Math.max(data.incidentsSummary.totalIncidents, 1)) * 100).toFixed(1)}%`,
          ],
        ],
      },
      {
        type: "keyValue",
        items: [
          {
            key: "Total Incidents",
            value: data.incidentsSummary.totalIncidents.toString(),
          },
          {
            key: "Resolved",
            value: data.incidentsSummary.resolvedIncidents.toString(),
          },
          {
            key: "NCA Notifications Made",
            value: data.incidentsSummary.ncaNotifications.toString(),
          },
        ],
      },
    ],
  });

  // 6. Debris Mitigation
  sections.push({
    title: "6. Debris Mitigation",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Passivation Compliance",
            value: data.debrisMitigation.passivationCompliance
              ? "Compliant"
              : "Non-Compliant",
          },
          {
            key: "Deorbit Compliance",
            value: data.debrisMitigation.deorbitCompliance
              ? "Compliant"
              : "Non-Compliant",
          },
          {
            key: "Collision Avoidance Maneuvers",
            value: data.debrisMitigation.collisionAvoidanceManeuvers.toString(),
          },
          {
            key: "Debris-Generating Events",
            value: data.debrisMitigation.debrisGeneratingEvents.toString(),
          },
        ],
      },
    ],
  });

  // 7. Cybersecurity
  sections.push({
    title: "7. Cybersecurity",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Incidents Reported",
            value: data.cybersecurity.incidentCount.toString(),
          },
          {
            key: "Last Assessment",
            value: data.cybersecurity.lastAssessmentDate
              ? data.cybersecurity.lastAssessmentDate.toLocaleDateString(
                  "en-GB",
                )
              : "Not completed",
          },
        ],
      },
      { type: "heading", value: "Certifications", level: 3 },
      {
        type: "list",
        items:
          data.cybersecurity.certifications.length > 0
            ? data.cybersecurity.certifications
            : ["No certifications on record"],
      },
    ],
  });

  // 8. Insurance
  sections.push({
    title: "8. Insurance Coverage",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Coverage Amount",
            value: `€${data.insurance.coverageAmount.toLocaleString()}`,
          },
          { key: "Insurer", value: data.insurance.insurer },
          {
            key: "Policy Expiry",
            value: data.insurance.policyExpiry
              ? data.insurance.policyExpiry.toLocaleDateString("en-GB")
              : "N/A",
          },
        ],
      },
    ],
  });

  // 9. Environmental Footprint
  sections.push({
    title: "9. Environmental Footprint",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "EFD Submitted",
            value: data.environmental.efdSubmitted ? "Yes" : "No",
          },
          {
            key: "Total GWP",
            value: data.environmental.totalGWP
              ? `${data.environmental.totalGWP.toLocaleString()} kg CO₂eq`
              : "Not calculated",
          },
          { key: "EFD Grade", value: data.environmental.efdGrade || "N/A" },
        ],
      },
    ],
  });

  // 10. Planned Activities
  if (data.plannedActivities.length > 0) {
    sections.push({
      title: "10. Planned Activities for Next Year",
      content: [{ type: "list", items: data.plannedActivities, ordered: true }],
    });
  }

  // 11. Contact Information
  sections.push({
    title: "11. Designated Contact",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Name", value: data.contactName || "Not specified" },
          { key: "Email", value: data.contactEmail || "Not specified" },
        ],
      },
    ],
  });

  return {
    metadata: {
      reportId: `ACR-${data.reportYear}`,
      reportType: "annual_compliance",
      title: `Annual Compliance Report ${data.reportYear}`,
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization,
    },
    header: {
      title: "Annual Compliance Report",
      subtitle: `EU Space Act Compliance Status - ${data.reportYear}`,
      reportNumber: `ACR-${data.reportYear}`,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "OFFICIAL",
      disclaimer:
        "This report summarizes compliance status as required under EU Space Act Article 33-34. " +
        "It should be submitted to the relevant National Competent Authority by the annual deadline. " +
        "This does not constitute legal advice. Generated by Caelex (caelex.eu).",
    },
    sections,
  };
}

/**
 * NCA Annual Compliance Report Component
 */
export function NCAAnnualComplianceReport({
  data,
}: {
  data: NCAAnnualComplianceReportData;
}) {
  const config = buildNCAAnnualComplianceReportConfig(data);
  return <BaseReport config={config} />;
}
