import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";

/**
 * Compliance Summary Report Data Structure
 */
export interface ComplianceSummaryData {
  reportNumber: string;
  reportDate: Date;
  organization: string;
  generatedBy: string;

  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  status: string;

  breakdown: Record<
    string,
    {
      score: number;
      weight: number;
      weightedScore: number;
      status: string;
      factors: Array<{
        name: string;
        description: string;
        maxPoints: number;
        earnedPoints: number;
        isCritical: boolean;
      }>;
    }
  >;

  recommendations: Array<{
    priority: string;
    module: string;
    action: string;
    impact: string;
    estimatedEffort: string;
  }>;
}

const moduleLabels: Record<string, string> = {
  authorization: "Authorization (25%)",
  debris: "Debris Mitigation (20%)",
  cybersecurity: "Cybersecurity (20%)",
  insurance: "Insurance (15%)",
  environmental: "Environmental (10%)",
  reporting: "Reporting (10%)",
};

/**
 * Build report configuration from compliance score data
 */
export function buildComplianceSummaryConfig(
  data: ComplianceSummaryData,
): ReportConfig {
  const sections: ReportSection[] = [];

  // 1. Executive Summary
  sections.push({
    title: "1. Executive Summary",
    content: [
      {
        type: "text",
        value: `This Compliance Summary Report presents an overall assessment of ${data.organization}'s compliance posture against the EU Space Act (COM(2025) 335) and related regulatory frameworks. The assessment covers six key compliance modules weighted by regulatory importance.`,
      },
      {
        type: "alert",
        severity:
          data.overall >= 80
            ? "info"
            : data.overall >= 50
              ? "warning"
              : "error",
        message: `Overall Compliance Score: ${data.overall}/100 (Grade ${data.grade}) - ${
          data.overall >= 80
            ? "Substantially compliant"
            : data.overall >= 50
              ? "Partially compliant - improvements required"
              : "Significant gaps identified - remediation required"
        }`,
      },
      {
        type: "keyValue",
        items: [
          { key: "Organization", value: data.organization },
          { key: "Overall Score", value: `${data.overall}/100` },
          { key: "Grade", value: data.grade },
          {
            key: "Status",
            value: data.status.replace(/_/g, " ").toUpperCase(),
          },
          {
            key: "Report Date",
            value: data.reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
        ],
      },
    ],
  });

  // 2. Module Breakdown
  sections.push({
    title: "2. Module Breakdown",
    content: [
      {
        type: "text",
        value:
          "The following table summarizes compliance scores across all assessed modules, weighted by their regulatory significance under the EU Space Act.",
      },
      {
        type: "table",
        headers: ["Module", "Score", "Weighted", "Status"],
        rows: Object.entries(data.breakdown).map(([key, mod]) => [
          moduleLabels[key] || key,
          `${mod.score}/100`,
          `${mod.weightedScore.toFixed(1)}`,
          mod.status.replace(/_/g, " ").toUpperCase(),
        ]),
      },
    ],
  });

  // 3. Detailed Module Analysis
  const moduleEntries = Object.entries(data.breakdown);
  moduleEntries.forEach(([key, mod], index) => {
    const sectionNum = index + 3;
    const label = moduleLabels[key] || key;

    const content: ReportSection["content"] = [
      {
        type: "alert",
        severity:
          mod.score >= 80 ? "info" : mod.score >= 50 ? "warning" : "error",
        message: `Module Score: ${mod.score}/100 - ${mod.status.replace(/_/g, " ").toUpperCase()}`,
      },
    ];

    if (mod.factors && mod.factors.length > 0) {
      content.push({
        type: "table",
        headers: ["Factor", "Points", "Max", "Critical"],
        rows: mod.factors.map((f) => [
          f.name,
          `${f.earnedPoints}`,
          `${f.maxPoints}`,
          f.isCritical ? "Yes" : "No",
        ]),
      });
    }

    sections.push({
      title: `${sectionNum}. ${label}`,
      content,
    });
  });

  // Recommendations
  const recSection = moduleEntries.length + 3;
  sections.push({
    title: `${recSection}. Recommendations`,
    content: [
      {
        type: "text",
        value:
          "The following recommendations are prioritized by regulatory impact and urgency:",
      },
      ...(data.recommendations.length > 0
        ? [
            {
              type: "table" as const,
              headers: ["Priority", "Module", "Action", "Effort"],
              rows: data.recommendations.map((r) => [
                r.priority.toUpperCase(),
                r.module,
                r.action.length > 50 ? r.action.slice(0, 47) + "..." : r.action,
                r.estimatedEffort.toUpperCase(),
              ]),
            },
          ]
        : [
            {
              type: "text" as const,
              value: "No specific recommendations at this time.",
            },
          ]),
    ],
  });

  // Disclaimer
  sections.push({
    title: `${recSection + 1}. Disclaimer`,
    content: [
      {
        type: "text",
        value: `This report was generated automatically by the Caelex Compliance Platform on ${data.reportDate.toLocaleDateString("en-GB")}. The compliance scores are based on self-assessment data provided by the organization and do not constitute a formal regulatory audit. For official compliance certification, please consult with your designated National Competent Authority (NCA).`,
      },
      { type: "spacer", height: 20 },
      {
        type: "keyValue",
        items: [
          { key: "Generated by", value: data.generatedBy },
          { key: "Organization", value: data.organization },
          { key: "Document Reference", value: data.reportNumber },
        ],
      },
    ],
  });

  return {
    metadata: {
      reportId: data.reportNumber,
      reportType: "annual_compliance",
      title: "Compliance Summary Report",
      generatedAt: data.reportDate,
      generatedBy: data.generatedBy,
      organization: data.organization,
    },
    header: {
      title: "Compliance Summary Report",
      subtitle: `${data.organization} - EU Space Act Compliance Assessment`,
      reportNumber: data.reportNumber,
      date: data.reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer:
        "This document is generated for compliance overview purposes. It does not constitute legal advice.",
    },
    sections,
  };
}

/**
 * Compliance Summary PDF Component
 */
interface ComplianceSummaryPDFProps {
  data: ComplianceSummaryData;
}

export function ComplianceSummaryPDF({ data }: ComplianceSummaryPDFProps) {
  const config = buildComplianceSummaryConfig(data);
  return <BaseReport config={config} />;
}
