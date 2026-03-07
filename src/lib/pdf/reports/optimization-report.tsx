import React from "react";
import { BaseReport } from "../templates/base-report";
import type { ReportConfig, ReportSection } from "../types";
import type {
  OptimizationOutput,
  JurisdictionRanking,
} from "@/lib/optimizer/types";

/**
 * Optimization Report Data Structure
 */
export interface OptimizationReportData {
  result: OptimizationOutput;
  weightProfile: string;
  generatedAt: string;
  organizationName?: string;
}

/**
 * Build report configuration from optimization result data
 */
export function buildOptimizationReportConfig(
  data: OptimizationReportData,
): ReportConfig {
  const sections: ReportSection[] = [];
  const { result, weightProfile, generatedAt, organizationName } = data;
  const reportDate = new Date(generatedAt);

  // 1. Optimization Summary
  sections.push({
    title: "1. Optimization Summary",
    content: [
      {
        type: "text",
        value: `This Regulatory Arbitrage Optimization Report presents a comparative analysis of jurisdictions for space operations licensing. The optimization was performed using the "${weightProfile}" weight profile to identify the most suitable regulatory environments.`,
      },
      {
        type: "keyValue",
        items: [
          { key: "Weight Profile", value: weightProfile },
          { key: "Best Overall", value: result.summary.bestOverall },
          { key: "Best for Timeline", value: result.summary.bestForTimeline },
          { key: "Best for Cost", value: result.summary.bestForCost },
          {
            key: "Best for Compliance",
            value: result.summary.bestForCompliance,
          },
          {
            key: "Generated Date",
            value: reportDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          },
        ],
      },
    ],
  });

  // 2. Jurisdiction Rankings
  sections.push({
    title: "2. Jurisdiction Rankings",
    content: [
      {
        type: "text",
        value:
          "The following table ranks all analyzed jurisdictions by their weighted composite score. Badges indicate category-leading performance.",
      },
      {
        type: "table",
        headers: [
          "Rank",
          "Jurisdiction",
          "Score",
          "Timeline",
          "App Fee",
          "Badges",
        ],
        rows: result.rankings.map((r: JurisdictionRanking, index: number) => [
          `${index + 1}`,
          `${r.flagEmoji} ${r.jurisdictionName}`,
          `${r.totalScore.toFixed(1)}`,
          `${r.timeline.min}-${r.timeline.max} wks`,
          r.estimatedCost.application,
          r.badges.length > 0
            ? r.badges
                .map((b) =>
                  b
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                )
                .join(", ")
            : "-",
        ]),
      },
    ],
  });

  // 3. Top Jurisdiction Analysis (top 3)
  const topJurisdictions = result.rankings.slice(0, 3);
  const analysisContent: ReportSection["content"] = [
    {
      type: "text",
      value:
        "Detailed analysis of the top three jurisdictions by weighted composite score.",
    },
  ];

  topJurisdictions.forEach((r: JurisdictionRanking, index: number) => {
    // Heading for each jurisdiction
    analysisContent.push({
      type: "heading",
      value: `${index + 1}. ${r.flagEmoji} ${r.jurisdictionName}`,
      level: 2,
    });

    // Key-value details
    analysisContent.push({
      type: "keyValue",
      items: [
        { key: "Total Score", value: `${r.totalScore.toFixed(1)}/100` },
        {
          key: "Timeline Score",
          value: `${r.dimensionScores.timeline.toFixed(1)}`,
        },
        { key: "Cost Score", value: `${r.dimensionScores.cost.toFixed(1)}` },
        {
          key: "Compliance Score",
          value: `${r.dimensionScores.compliance.toFixed(1)}`,
        },
        {
          key: "Insurance Score",
          value: `${r.dimensionScores.insurance.toFixed(1)}`,
        },
        {
          key: "Liability Score",
          value: `${r.dimensionScores.liability.toFixed(1)}`,
        },
        {
          key: "Debris Score",
          value: `${r.dimensionScores.debris.toFixed(1)}`,
        },
        {
          key: "Processing Time",
          value: `${r.timeline.min}-${r.timeline.max} weeks`,
        },
        { key: "Application Fee", value: r.estimatedCost.application },
      ],
    });

    // Advantages
    if (r.keyAdvantages.length > 0) {
      analysisContent.push({
        type: "heading",
        value: "Key Advantages",
        level: 3,
      });
      analysisContent.push({
        type: "list",
        items: r.keyAdvantages,
        ordered: false,
      });
    }

    // Risks
    if (r.keyRisks.length > 0) {
      analysisContent.push({
        type: "heading",
        value: "Key Risks",
        level: 3,
      });
      analysisContent.push({
        type: "list",
        items: r.keyRisks,
        ordered: false,
      });
    }

    // Divider between jurisdictions (not after the last one)
    if (index < topJurisdictions.length - 1) {
      analysisContent.push({ type: "divider" });
    }
  });

  sections.push({
    title: "3. Top Jurisdiction Analysis",
    content: analysisContent,
  });

  // 4. Migration Path (conditional)
  if (result.migrationPath && result.migrationPath.length > 0) {
    sections.push({
      title: "4. Migration Path",
      content: [
        {
          type: "text",
          value:
            "The following migration path outlines the recommended steps for transitioning to the optimal jurisdiction.",
        },
        {
          type: "list",
          items: result.migrationPath.map(
            (step) =>
              `Step ${step.order}: ${step.title} (${step.estimatedDuration})${step.cost ? ` - Est. cost: ${step.cost}` : ""} — ${step.description}`,
          ),
          ordered: true,
        },
      ],
    });
  }

  // Disclaimer
  const disclaimerSectionNum = result.migrationPath?.length ? 5 : 4;
  sections.push({
    title: `${disclaimerSectionNum}. Disclaimer`,
    content: [
      {
        type: "text",
        value: `This report was generated automatically by the Caelex Regulatory Arbitrage Optimizer on ${reportDate.toLocaleDateString("en-GB")}. The rankings and scores are based on publicly available regulatory data and internal scoring models. They do not constitute legal advice. For formal regulatory guidance, please consult with qualified legal counsel in the relevant jurisdiction.`,
      },
      { type: "spacer", height: 20 },
      {
        type: "keyValue",
        items: [
          { key: "Generated by", value: "Caelex Compliance Platform" },
          ...(organizationName
            ? [{ key: "Organization", value: organizationName }]
            : []),
          { key: "Weight Profile", value: weightProfile },
        ],
      },
    ],
  });

  return {
    metadata: {
      reportId: `OPT-${Date.now()}`,
      reportType: "executive_summary",
      title: "Regulatory Arbitrage Optimization Report",
      generatedAt: reportDate,
      generatedBy: "Caelex Compliance Platform",
      organization: organizationName,
    },
    header: {
      title: "Regulatory Arbitrage Optimization Report",
      subtitle: organizationName
        ? `${organizationName} - Jurisdiction Analysis`
        : "Jurisdiction Analysis",
      date: reportDate,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice: "CONFIDENTIAL",
      disclaimer:
        "This document is generated for informational purposes only. It does not constitute legal or regulatory advice.",
    },
    sections,
  };
}

/**
 * Optimization Report PDF Component
 */
interface OptimizationReportPDFProps {
  data: OptimizationReportData;
}

export function OptimizationReportPDF({ data }: OptimizationReportPDFProps) {
  const config = buildOptimizationReportConfig(data);
  return <BaseReport config={config} />;
}
