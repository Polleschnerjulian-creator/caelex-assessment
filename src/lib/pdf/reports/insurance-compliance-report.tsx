import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

/**
 * Insurance Compliance Report Data Structure
 * Based on EU Space Act Art. 15 requirements
 */
export interface InsuranceComplianceReportData {
  // Header info
  reportNumber: string;
  reportDate: Date;
  organization: string;
  generatedBy: string;

  // Operator profile
  operatorProfile: {
    name: string;
    jurisdiction: string;
    operatorType: string;
    companySize: string;
    registrationNumber?: string;
    contactEmail?: string;
    contactPhone?: string;
  };

  // Mission details
  missionProfile: {
    missionName: string;
    missionType: string;
    orbitType: string;
    satelliteCount: number;
    totalMassKg: number;
    launchValue: string;
    inOrbitValue: string;
    plannedLaunchDate?: string;
    launchProvider?: string;
    launchSite?: string;
  };

  // TPL Analysis
  tplAnalysis: {
    requiredCoverage: string;
    requiredCoverageEUR: number;
    calculationBasis: string;
    riskFactors: string[];
    jurisdictionRequirements: string;
    euSpaceActReference: string;
  };

  // Required policies
  requiredPolicies: Array<{
    type: string;
    description: string;
    minimumCoverage: string;
    status: "covered" | "pending" | "missing";
    policyNumber?: string;
    insurer?: string;
    validUntil?: string;
    notes?: string;
  }>;

  // Optional policies
  optionalPolicies: Array<{
    type: string;
    description: string;
    recommendedCoverage: string;
    priority: "high" | "medium" | "low";
    rationale: string;
  }>;

  // Premium estimates
  premiumEstimates: {
    annualPremiumMin: string;
    annualPremiumMax: string;
    factors: string[];
    marketConditions: string;
  };

  // Compliance status
  complianceStatus: {
    overallStatus: "compliant" | "partial" | "non_compliant";
    compliantPolicies: number;
    pendingPolicies: number;
    missingPolicies: number;
    gaps: string[];
    recommendations: string[];
  };

  // Regulatory requirements by jurisdiction
  regulatoryRequirements: Array<{
    jurisdiction: string;
    requirement: string;
    minimumCoverage: string;
    applicability: string;
  }>;

  // Next steps
  nextSteps: string[];
}

/**
 * Build report configuration from insurance data
 */
export function buildInsuranceComplianceReportConfig(
  data: InsuranceComplianceReportData,
): ReportConfig {
  const sections: ReportSection[] = [];

  // 1. Executive Summary
  sections.push({
    title: "1. Executive Summary",
    content: [
      {
        type: "text",
        value: `This Insurance Compliance Report has been prepared in accordance with EU Space Act Article 15 (Insurance and Financial Security) requirements. It provides an analysis of insurance requirements, current coverage status, and recommendations for ${data.operatorProfile.name}.`,
      },
      {
        type: "alert",
        severity:
          data.complianceStatus.overallStatus === "compliant"
            ? "info"
            : data.complianceStatus.overallStatus === "partial"
              ? "warning"
              : "error",
        message:
          data.complianceStatus.overallStatus === "compliant"
            ? "✓ All required insurance policies are in place"
            : data.complianceStatus.overallStatus === "partial"
              ? `⚠ ${data.complianceStatus.pendingPolicies} policies pending, ${data.complianceStatus.missingPolicies} policies missing`
              : `✗ ${data.complianceStatus.missingPolicies} required policies are missing`,
      },
      {
        type: "keyValue",
        items: [
          { key: "Operator", value: data.operatorProfile.name },
          { key: "Mission", value: data.missionProfile.missionName },
          {
            key: "Required TPL Coverage",
            value: data.tplAnalysis.requiredCoverage,
          },
          {
            key: "Compliance Status",
            value: data.complianceStatus.overallStatus
              .replace("_", " ")
              .toUpperCase(),
          },
        ],
      },
    ],
  });

  // 2. Operator Profile
  sections.push({
    title: "2. Operator Profile",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Organization Name", value: data.operatorProfile.name },
          { key: "Jurisdiction", value: data.operatorProfile.jurisdiction },
          { key: "Operator Type", value: data.operatorProfile.operatorType },
          { key: "Company Size", value: data.operatorProfile.companySize },
          ...(data.operatorProfile.registrationNumber
            ? [
                {
                  key: "Registration Number",
                  value: data.operatorProfile.registrationNumber,
                },
              ]
            : []),
          ...(data.operatorProfile.contactEmail
            ? [
                {
                  key: "Contact Email",
                  value: data.operatorProfile.contactEmail,
                },
              ]
            : []),
        ],
      },
    ],
  });

  // 3. Mission Profile
  sections.push({
    title: "3. Mission Profile & Asset Valuation",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Mission Name", value: data.missionProfile.missionName },
          { key: "Mission Type", value: data.missionProfile.missionType },
          { key: "Orbital Regime", value: data.missionProfile.orbitType },
          {
            key: "Number of Satellites",
            value: data.missionProfile.satelliteCount.toString(),
          },
          {
            key: "Total Spacecraft Mass",
            value: `${data.missionProfile.totalMassKg} kg`,
          },
          { key: "Launch Value", value: data.missionProfile.launchValue },
          {
            key: "In-Orbit Asset Value",
            value: data.missionProfile.inOrbitValue,
          },
          ...(data.missionProfile.launchProvider
            ? [
                {
                  key: "Launch Provider",
                  value: data.missionProfile.launchProvider,
                },
              ]
            : []),
          ...(data.missionProfile.plannedLaunchDate
            ? [
                {
                  key: "Planned Launch Date",
                  value: data.missionProfile.plannedLaunchDate,
                },
              ]
            : []),
        ],
      },
    ],
  });

  // 4. Third Party Liability Analysis
  sections.push({
    title: "4. Third Party Liability (TPL) Analysis",
    content: [
      {
        type: "text",
        value: `Per EU Space Act Article 15, operators must maintain adequate insurance or financial security to cover potential third-party liability claims arising from space operations.`,
      },
      {
        type: "keyValue",
        items: [
          {
            key: "Required TPL Coverage",
            value: data.tplAnalysis.requiredCoverage,
          },
          {
            key: "Coverage Amount (EUR)",
            value: `€${data.tplAnalysis.requiredCoverageEUR.toLocaleString()}`,
          },
          {
            key: "Calculation Basis",
            value: data.tplAnalysis.calculationBasis,
          },
          {
            key: "EU Space Act Reference",
            value: data.tplAnalysis.euSpaceActReference,
          },
          {
            key: "Jurisdiction Requirements",
            value: data.tplAnalysis.jurisdictionRequirements,
          },
        ],
      },
      { type: "heading", value: "4.1 Risk Factors Considered", level: 2 },
      {
        type: "list",
        items: data.tplAnalysis.riskFactors,
      },
    ],
  });

  // 5. Required Insurance Policies
  sections.push({
    title: "5. Required Insurance Policies",
    content: [
      {
        type: "text",
        value: `The following insurance policies are required under applicable space law and EU Space Act requirements:`,
      },
      {
        type: "table",
        headers: ["Policy Type", "Min. Coverage", "Status", "Insurer"],
        rows: data.requiredPolicies.map((policy) => [
          policy.type,
          policy.minimumCoverage,
          policy.status.toUpperCase(),
          policy.insurer || "-",
        ]),
      },
      ...data.requiredPolicies
        .filter((p) => p.status !== "covered" && p.notes)
        .map((policy) => ({
          type: "alert" as const,
          severity:
            policy.status === "missing"
              ? ("error" as const)
              : ("warning" as const),
          message: `${policy.type}: ${policy.notes}`,
        })),
    ],
  });

  // 6. Detailed Policy Requirements
  sections.push({
    title: "6. Detailed Policy Requirements",
    content: data.requiredPolicies.flatMap((policy, index) => [
      {
        type: "heading" as const,
        value: `6.${index + 1} ${policy.type}`,
        level: 2 as const,
      },
      {
        type: "keyValue" as const,
        items: [
          { key: "Description", value: policy.description },
          { key: "Minimum Coverage", value: policy.minimumCoverage },
          { key: "Current Status", value: policy.status.toUpperCase() },
          ...(policy.policyNumber
            ? [{ key: "Policy Number", value: policy.policyNumber }]
            : []),
          ...(policy.insurer
            ? [{ key: "Insurer", value: policy.insurer }]
            : []),
          ...(policy.validUntil
            ? [{ key: "Valid Until", value: policy.validUntil }]
            : []),
        ],
      },
    ]),
  });

  // 7. Recommended Additional Coverage
  if (data.optionalPolicies.length > 0) {
    sections.push({
      title: "7. Recommended Additional Coverage",
      content: [
        {
          type: "text",
          value:
            "The following additional insurance products are recommended based on the mission profile and risk assessment:",
        },
        {
          type: "table",
          headers: [
            "Policy Type",
            "Recommended Coverage",
            "Priority",
            "Rationale",
          ],
          rows: data.optionalPolicies.map((policy) => [
            policy.type,
            policy.recommendedCoverage,
            policy.priority.toUpperCase(),
            policy.rationale.slice(0, 50) +
              (policy.rationale.length > 50 ? "..." : ""),
          ]),
        },
      ],
    });
  }

  // 8. Premium Estimates
  sections.push({
    title: "8. Premium Cost Estimates",
    content: [
      {
        type: "alert",
        severity: "info",
        message:
          "Premium estimates are indicative and subject to underwriting. Actual premiums may vary based on detailed risk assessment.",
      },
      {
        type: "keyValue",
        items: [
          {
            key: "Estimated Annual Premium (Range)",
            value: `${data.premiumEstimates.annualPremiumMin} - ${data.premiumEstimates.annualPremiumMax}`,
          },
          {
            key: "Market Conditions",
            value: data.premiumEstimates.marketConditions,
          },
        ],
      },
      { type: "heading", value: "8.1 Premium Factors", level: 2 },
      {
        type: "list",
        items: data.premiumEstimates.factors,
      },
    ],
  });

  // 9. Regulatory Requirements by Jurisdiction
  sections.push({
    title: "9. Regulatory Requirements by Jurisdiction",
    content: [
      {
        type: "text",
        value:
          "Insurance requirements vary by licensing jurisdiction. The following requirements apply to your operations:",
      },
      {
        type: "table",
        headers: ["Jurisdiction", "Requirement", "Minimum", "Applicability"],
        rows: data.regulatoryRequirements.map((req) => [
          req.jurisdiction,
          req.requirement.slice(0, 30) +
            (req.requirement.length > 30 ? "..." : ""),
          req.minimumCoverage,
          req.applicability,
        ]),
      },
    ],
  });

  // 10. Compliance Gaps & Recommendations
  sections.push({
    title: "10. Compliance Gaps & Recommendations",
    content: [
      { type: "heading", value: "10.1 Identified Gaps", level: 2 },
      ...(data.complianceStatus.gaps.length > 0
        ? [
            {
              type: "list" as const,
              items: data.complianceStatus.gaps,
            },
          ]
        : [
            {
              type: "text" as const,
              value: "No compliance gaps identified.",
            },
          ]),
      { type: "heading", value: "10.2 Recommendations", level: 2 },
      {
        type: "list",
        items: data.complianceStatus.recommendations,
        ordered: true,
      },
    ],
  });

  // 11. Next Steps
  sections.push({
    title: "11. Action Items & Next Steps",
    content: [
      {
        type: "list",
        items: data.nextSteps,
        ordered: true,
      },
      { type: "spacer", height: 20 },
      {
        type: "alert",
        severity: "info",
        message:
          "For insurance broker referrals or questions about space insurance requirements, contact your National Competent Authority or consult with a specialized space insurance broker.",
      },
    ],
  });

  // 12. Certification
  sections.push({
    title: "12. Report Certification",
    content: [
      {
        type: "text",
        value: `This Insurance Compliance Report has been prepared by ${data.organization} based on information provided by the operator and applicable regulatory requirements.`,
      },
      { type: "spacer", height: 20 },
      {
        type: "keyValue",
        items: [
          { key: "Prepared by", value: data.generatedBy },
          { key: "Organization", value: data.organization },
          {
            key: "Report Date",
            value: data.reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
          { key: "Document Reference", value: data.reportNumber },
        ],
      },
      { type: "spacer", height: 15 },
      {
        type: "text",
        value:
          "This report is provided for informational purposes and does not constitute insurance advice. Operators should consult with qualified insurance professionals and legal advisors.",
      },
    ],
  });

  return {
    metadata: {
      reportId: data.reportNumber,
      reportType: "insurance",
      title: "Insurance Compliance Report",
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization,
    },
    header: {
      title: "Insurance Compliance Report",
      subtitle: `${data.missionProfile.missionName} - EU Space Act Art. 15`,
      reportNumber: data.reportNumber,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer:
        "This document does not constitute insurance or legal advice. Consult qualified professionals.",
    },
    sections,
  };
}

/**
 * Insurance Compliance Report PDF Component
 */
interface InsuranceComplianceReportPDFProps {
  data: InsuranceComplianceReportData;
}

export function InsuranceComplianceReportPDF({
  data,
}: InsuranceComplianceReportPDFProps) {
  const config = buildInsuranceComplianceReportConfig(data);
  return <BaseReport config={config} />;
}
