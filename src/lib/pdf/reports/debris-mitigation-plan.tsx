import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

/**
 * Debris Mitigation Plan Data Structure
 * Based on EU Space Act Art. 12 requirements
 */
export interface DebrisMitigationPlanData {
  // Header info
  reportNumber: string;
  reportDate: Date;
  organization: string;
  generatedBy: string;

  // Mission overview
  missionName: string;
  operator: string;
  orbitType: string;
  orbitParameters: string;
  altitudeKm?: number;
  inclinationDeg?: number;
  missionDuration: string;
  plannedDurationYears: number;
  satelliteCount: number;
  constellationTier: string;
  launchDate?: string;
  endOfLifeDate?: string;

  // Spacecraft characteristics
  spacecraft: {
    mass: string;
    dimensions?: string;
    hasPropulsion: boolean;
    propellantType?: string;
    maneuverability: "full" | "limited" | "none";
  };

  // Collision avoidance
  collisionAvoidance: {
    strategy: string;
    serviceProvider: string;
    maneuverCapability: string;
    procedures: string[];
    trackingAccuracy?: string;
  };

  // End-of-life disposal
  endOfLifeDisposal: {
    method: string;
    methodDescription: string;
    timeline: string;
    propellantBudget: string;
    backupStrategy: string;
    successProbability?: string;
  };

  // Fragmentation avoidance
  fragmentationAvoidance: {
    designMeasures: string[];
    operationalProcedures: string[];
  };

  // Passivation
  passivation: {
    energySources: string[];
    procedures: string[];
    timeline: string;
    hasCapability: boolean;
  };

  // 25-year compliance
  complianceVerification: {
    twentyFiveYearCompliance: boolean;
    calculatedLifetime?: string;
    calculationMethod: string;
    uncertaintyMargin: string;
    complianceStatement: string;
  };

  // Requirements matrix
  requirementsMatrix: Array<{
    id: string;
    title: string;
    articleRef: string;
    status: "compliant" | "in_progress" | "not_compliant" | "not_applicable";
    notes: string | null;
  }>;

  // Overall compliance
  complianceScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

/**
 * Build report configuration from debris plan data
 */
export function buildDebrisMitigationPlanConfig(
  data: DebrisMitigationPlanData,
): ReportConfig {
  const sections: ReportSection[] = [];

  // 1. Executive Summary
  sections.push({
    title: "1. Executive Summary",
    content: [
      {
        type: "text",
        value: `This Debris Mitigation Plan has been prepared in accordance with EU Space Act Article 12 and the EU Space Law Guidelines on Space Debris Mitigation. It demonstrates compliance with international standards including IADC Space Debris Mitigation Guidelines and ISO 24113.`,
      },
      {
        type: "alert",
        severity:
          data.complianceScore >= 80
            ? "info"
            : data.complianceScore >= 60
              ? "warning"
              : "error",
        message: `Overall Compliance Score: ${data.complianceScore}% - ${
          data.complianceScore >= 80
            ? "Substantially compliant"
            : data.complianceScore >= 60
              ? "Partially compliant - improvements required"
              : "Significant gaps identified - remediation required"
        }`,
      },
      {
        type: "keyValue",
        items: [
          { key: "Mission Name", value: data.missionName },
          { key: "Operator", value: data.operator },
          { key: "Orbit Type", value: data.orbitType },
          {
            key: "Number of Satellites",
            value: data.satelliteCount.toString(),
          },
          { key: "Mission Duration", value: data.missionDuration },
          {
            key: "Risk Classification",
            value: data.riskLevel.toUpperCase(),
          },
        ],
      },
    ],
  });

  // 2. Mission Overview
  sections.push({
    title: "2. Mission Overview",
    content: [
      { type: "heading", value: "2.1 Mission Parameters", level: 2 },
      {
        type: "keyValue",
        items: [
          { key: "Mission Name", value: data.missionName },
          { key: "Operating Organization", value: data.operator },
          { key: "Orbital Regime", value: data.orbitType },
          { key: "Orbital Parameters", value: data.orbitParameters },
          ...(data.altitudeKm
            ? [{ key: "Altitude", value: `${data.altitudeKm} km` }]
            : []),
          ...(data.inclinationDeg
            ? [{ key: "Inclination", value: `${data.inclinationDeg}°` }]
            : []),
          {
            key: "Planned Mission Duration",
            value: `${data.plannedDurationYears} years`,
          },
          {
            key: "Number of Spacecraft",
            value: data.satelliteCount.toString(),
          },
          { key: "Constellation Tier", value: data.constellationTier },
          ...(data.launchDate
            ? [{ key: "Planned Launch", value: data.launchDate }]
            : []),
          ...(data.endOfLifeDate
            ? [{ key: "Planned End of Life", value: data.endOfLifeDate }]
            : []),
        ],
      },
      { type: "heading", value: "2.2 Spacecraft Characteristics", level: 2 },
      {
        type: "keyValue",
        items: [
          { key: "Spacecraft Mass", value: data.spacecraft.mass },
          ...(data.spacecraft.dimensions
            ? [{ key: "Dimensions", value: data.spacecraft.dimensions }]
            : []),
          {
            key: "Propulsion System",
            value: data.spacecraft.hasPropulsion
              ? `Yes (${data.spacecraft.propellantType || "Type TBD"})`
              : "No onboard propulsion",
          },
          {
            key: "Maneuverability",
            value:
              data.spacecraft.maneuverability === "full"
                ? "Full 3-axis maneuverability"
                : data.spacecraft.maneuverability === "limited"
                  ? "Limited maneuverability"
                  : "Non-maneuverable",
          },
        ],
      },
    ],
  });

  // 3. Collision Avoidance (Art. 12(2)(a))
  sections.push({
    title: "3. Collision Avoidance Strategy",
    content: [
      {
        type: "text",
        value:
          "Per EU Space Act Article 12(2)(a), the following collision avoidance measures are implemented:",
      },
      {
        type: "keyValue",
        items: [
          {
            key: "Avoidance Strategy",
            value: data.collisionAvoidance.strategy,
          },
          {
            key: "CA Service Provider",
            value: data.collisionAvoidance.serviceProvider,
          },
          {
            key: "Maneuver Capability",
            value: data.collisionAvoidance.maneuverCapability,
          },
          ...(data.collisionAvoidance.trackingAccuracy
            ? [
                {
                  key: "Tracking Accuracy",
                  value: data.collisionAvoidance.trackingAccuracy,
                },
              ]
            : []),
        ],
      },
      { type: "heading", value: "3.1 Operational Procedures", level: 2 },
      {
        type: "list",
        items: data.collisionAvoidance.procedures,
        ordered: true,
      },
    ],
  });

  // 4. End-of-Life Disposal (Art. 12(2)(b))
  sections.push({
    title: "4. End-of-Life Disposal Plan",
    content: [
      {
        type: "text",
        value:
          "Per EU Space Act Article 12(2)(b), the following end-of-life disposal measures are planned:",
      },
      {
        type: "keyValue",
        items: [
          { key: "Disposal Method", value: data.endOfLifeDisposal.method },
          {
            key: "Method Description",
            value: data.endOfLifeDisposal.methodDescription,
          },
          { key: "Disposal Timeline", value: data.endOfLifeDisposal.timeline },
          {
            key: "Propellant Budget",
            value: data.endOfLifeDisposal.propellantBudget,
          },
          {
            key: "Backup Strategy",
            value: data.endOfLifeDisposal.backupStrategy,
          },
          ...(data.endOfLifeDisposal.successProbability
            ? [
                {
                  key: "Success Probability",
                  value: data.endOfLifeDisposal.successProbability,
                },
              ]
            : []),
        ],
      },
      {
        type: "alert",
        severity: data.complianceVerification.twentyFiveYearCompliance
          ? "info"
          : "warning",
        message: data.complianceVerification.twentyFiveYearCompliance
          ? "✓ 25-year rule compliance verified"
          : "⚠ 25-year rule compliance requires verification or mitigation measures",
      },
    ],
  });

  // 5. Fragmentation Avoidance
  sections.push({
    title: "5. Fragmentation Avoidance Measures",
    content: [
      {
        type: "text",
        value:
          "Measures to prevent accidental fragmentation during mission and end-of-life:",
      },
      { type: "heading", value: "5.1 Design Measures", level: 2 },
      {
        type: "list",
        items: data.fragmentationAvoidance.designMeasures,
      },
      { type: "heading", value: "5.2 Operational Procedures", level: 2 },
      {
        type: "list",
        items: data.fragmentationAvoidance.operationalProcedures,
      },
    ],
  });

  // 6. Passivation Plan
  sections.push({
    title: "6. Passivation Plan",
    content: [
      {
        type: "text",
        value:
          "At end-of-mission, the following energy sources will be passivated to minimize long-term fragmentation risk:",
      },
      { type: "heading", value: "6.1 Energy Sources to Passivate", level: 2 },
      {
        type: "list",
        items: data.passivation.energySources,
      },
      { type: "heading", value: "6.2 Passivation Procedures", level: 2 },
      {
        type: "list",
        items: data.passivation.procedures,
        ordered: true,
      },
      {
        type: "keyValue",
        items: [
          { key: "Passivation Timeline", value: data.passivation.timeline },
          {
            key: "Passivation Capability",
            value: data.passivation.hasCapability
              ? "Full passivation capability available"
              : "Limited passivation capability",
          },
        ],
      },
    ],
  });

  // 7. Compliance Verification
  sections.push({
    title: "7. Compliance Verification",
    content: [
      { type: "heading", value: "7.1 25-Year Rule Analysis", level: 2 },
      {
        type: "keyValue",
        items: [
          {
            key: "25-Year Compliance",
            value: data.complianceVerification.twentyFiveYearCompliance
              ? "COMPLIANT"
              : "NON-COMPLIANT / REQUIRES MITIGATION",
          },
          ...(data.complianceVerification.calculatedLifetime
            ? [
                {
                  key: "Calculated Orbital Lifetime",
                  value: data.complianceVerification.calculatedLifetime,
                },
              ]
            : []),
          {
            key: "Calculation Method",
            value: data.complianceVerification.calculationMethod,
          },
          {
            key: "Uncertainty Margin",
            value: data.complianceVerification.uncertaintyMargin,
          },
        ],
      },
      {
        type: "text",
        value: data.complianceVerification.complianceStatement,
      },
    ],
  });

  // 8. Requirements Matrix
  const compliantReqs = data.requirementsMatrix.filter(
    (r) => r.status === "compliant",
  );
  const inProgressReqs = data.requirementsMatrix.filter(
    (r) => r.status === "in_progress",
  );
  const nonCompliantReqs = data.requirementsMatrix.filter(
    (r) => r.status === "not_compliant",
  );

  sections.push({
    title: "8. Requirements Compliance Matrix",
    content: [
      {
        type: "text",
        value: `Summary: ${compliantReqs.length} compliant, ${inProgressReqs.length} in progress, ${nonCompliantReqs.length} non-compliant of ${data.requirementsMatrix.length} applicable requirements.`,
      },
      {
        type: "table",
        headers: ["Requirement", "Article", "Status", "Notes"],
        rows: data.requirementsMatrix
          .slice(0, 15)
          .map((req) => [
            req.title.length > 40 ? req.title.slice(0, 37) + "..." : req.title,
            req.articleRef,
            req.status.replace("_", " ").toUpperCase(),
            req.notes?.slice(0, 30) || "-",
          ]),
      },
      ...(data.requirementsMatrix.length > 15
        ? [
            {
              type: "text" as const,
              value: `... and ${data.requirementsMatrix.length - 15} more requirements (see detailed assessment)`,
            },
          ]
        : []),
    ],
  });

  // 9. Certification Statement
  sections.push({
    title: "9. Certification Statement",
    content: [
      {
        type: "text",
        value: `This Debris Mitigation Plan has been prepared by ${data.organization} in accordance with:`,
      },
      {
        type: "list",
        items: [
          "EU Space Act (COM(2024) XXX) Article 12 - Space Debris Mitigation",
          "IADC Space Debris Mitigation Guidelines (2020 revision)",
          "ISO 24113:2019 - Space systems - Space debris mitigation requirements",
          "UN COPUOS Space Debris Mitigation Guidelines",
          "ESA Space Debris Mitigation Policy (ESA/ADMIN/IPOL(2023)2)",
        ],
      },
      { type: "spacer", height: 20 },
      {
        type: "text",
        value: `The operator certifies that the information provided in this plan is accurate and complete to the best of their knowledge, and commits to implementing the debris mitigation measures described herein.`,
      },
      { type: "spacer", height: 30 },
      {
        type: "keyValue",
        items: [
          { key: "Prepared by", value: data.generatedBy },
          { key: "Organization", value: data.organization },
          {
            key: "Date",
            value: data.reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
          { key: "Document Reference", value: data.reportNumber },
        ],
      },
    ],
  });

  return {
    metadata: {
      reportId: data.reportNumber,
      reportType: "debris_event",
      title: "Debris Mitigation Plan",
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization,
    },
    header: {
      title: "Debris Mitigation Plan",
      subtitle: `${data.missionName} - EU Space Act Art. 12 Compliance`,
      reportNumber: data.reportNumber,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer:
        "This document is generated for regulatory compliance purposes. It does not constitute legal advice.",
    },
    sections,
  };
}

/**
 * Debris Mitigation Plan PDF Component
 */
interface DebrisMitigationPlanPDFProps {
  data: DebrisMitigationPlanData;
}

export function DebrisMitigationPlanPDF({
  data,
}: DebrisMitigationPlanPDFProps) {
  const config = buildDebrisMitigationPlanConfig(data);
  return <BaseReport config={config} />;
}
