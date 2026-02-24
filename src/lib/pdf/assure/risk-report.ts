/**
 * Risk Report Template — Caelex Assure
 *
 * Standalone risk analysis report with heat map summary, full risk register,
 * category analysis, mitigation coverage, scenario analysis, financial
 * exposure, and regulatory risk detail.
 * Returns a ReportConfig JSON structure for client-side PDF rendering.
 */

import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "../types";
import {
  formatEUR,
  formatFraction,
  formatNumber,
  formatDate,
  generateReportId,
} from "./format";

// ─── Input Data Shape ───────────────────────────────────────────────────────

export interface RiskReportData {
  companyName: string;

  irsGrade?: string;
  irsScore?: number;

  risks: Array<{
    title: string;
    category: string;
    probability: string;
    impact: string;
    riskScore: number;
    financialExposure?: number;
    mitigationStrategy?: string;
    mitigationStatus: string;
    timeHorizon?: string;
  }>;

  heatmapSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  mitigationCoverage: number; // 0-1

  scenarios?: Array<{
    name: string;
    description: string;
    financialImpact: {
      bestCase: number;
      mostLikely: number;
      worstCase: number;
    };
    triggeredRisks: number;
  }>;

  totalFinancialExposure?: number;

  regulatoryRisks?: Array<{
    risk: string;
    status: string;
  }>;

  complyVerified?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function severityAlert(
  heatmap: RiskReportData["heatmapSummary"],
): ReportSectionContent {
  if (heatmap.critical > 0) {
    return {
      type: "alert",
      severity: "error",
      message:
        `${heatmap.critical} critical risk${heatmap.critical > 1 ? "s" : ""} identified. ` +
        "Immediate executive attention and mitigation actions are required.",
    };
  }
  if (heatmap.high > 0) {
    return {
      type: "alert",
      severity: "warning",
      message:
        `${heatmap.high} high-severity risk${heatmap.high > 1 ? "s" : ""} identified. ` +
        "Active mitigation plans should be in place and monitored regularly.",
    };
  }
  return {
    type: "alert",
    severity: "info",
    message:
      "No critical or high-severity risks identified. Continue monitoring the risk register on a regular cadence.",
  };
}

function groupRisksByCategory(
  risks: RiskReportData["risks"],
): Map<string, RiskReportData["risks"]> {
  const grouped = new Map<string, RiskReportData["risks"]>();
  for (const risk of risks) {
    const cat = risk.category || "Uncategorized";
    if (!grouped.has(cat)) {
      grouped.set(cat, []);
    }
    grouped.get(cat)!.push(risk);
  }
  return grouped;
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildRiskReport(data: RiskReportData): ReportConfig {
  const now = new Date();
  const sections: ReportSection[] = [];
  let sectionNum = 0;

  const nextSection = (): string => {
    sectionNum++;
    return `${sectionNum}`;
  };

  const totalRisks = data.risks.length;

  // ── 1. Executive Summary ───────────────────────────────────────────────

  {
    const summaryContent: ReportSectionContent[] = [
      {
        type: "text",
        value:
          `This Risk Analysis Report presents a comprehensive assessment of the risk landscape for ${data.companyName}. ` +
          `A total of ${totalRisks} risk${totalRisks !== 1 ? "s" : ""} have been identified across ` +
          `${groupRisksByCategory(data.risks).size} categories. ` +
          `The overall mitigation coverage stands at ${formatFraction(data.mitigationCoverage)}.`,
      },
      { type: "spacer", height: 6 },
      severityAlert(data.heatmapSummary),
      { type: "spacer", height: 8 },
    ];

    const kvItems: Array<{ key: string; value: string }> = [
      { key: "Company", value: data.companyName },
      { key: "Total Risks Identified", value: formatNumber(totalRisks) },
      {
        key: "Mitigation Coverage",
        value: formatFraction(data.mitigationCoverage),
      },
    ];

    if (data.irsGrade) {
      kvItems.push({
        key: "IRS Grade",
        value: `${data.irsGrade}${data.irsScore != null ? ` (${data.irsScore}/100)` : ""}`,
      });
    }

    if (data.totalFinancialExposure != null) {
      kvItems.push({
        key: "Total Financial Exposure",
        value: formatEUR(data.totalFinancialExposure),
      });
    }

    summaryContent.push({ type: "keyValue", items: kvItems });

    sections.push({
      title: `${nextSection()}. Executive Summary`,
      content: summaryContent,
    });
  }

  // ── 2. Risk Heat Map Summary ───────────────────────────────────────────

  {
    const heatmap = data.heatmapSummary;
    const heatmapTotal =
      heatmap.critical + heatmap.high + heatmap.medium + heatmap.low;

    sections.push({
      title: `${nextSection()}. Risk Heat Map Summary`,
      content: [
        {
          type: "text",
          value:
            "The following table summarizes the distribution of identified risks by severity level. " +
            "Severity is determined by the combination of probability and impact ratings.",
        },
        { type: "spacer", height: 6 },
        {
          type: "table",
          headers: ["Severity", "Count", "Percentage"],
          rows: [
            [
              "CRITICAL",
              String(heatmap.critical),
              heatmapTotal > 0
                ? `${((heatmap.critical / heatmapTotal) * 100).toFixed(1)}%`
                : "0%",
            ],
            [
              "HIGH",
              String(heatmap.high),
              heatmapTotal > 0
                ? `${((heatmap.high / heatmapTotal) * 100).toFixed(1)}%`
                : "0%",
            ],
            [
              "MEDIUM",
              String(heatmap.medium),
              heatmapTotal > 0
                ? `${((heatmap.medium / heatmapTotal) * 100).toFixed(1)}%`
                : "0%",
            ],
            [
              "LOW",
              String(heatmap.low),
              heatmapTotal > 0
                ? `${((heatmap.low / heatmapTotal) * 100).toFixed(1)}%`
                : "0%",
            ],
            ["TOTAL", String(heatmapTotal), "100%"],
          ],
        },
      ],
    });
  }

  // ── 3. Risk Register ───────────────────────────────────────────────────

  {
    const registerContent: ReportSectionContent[] = [
      {
        type: "text",
        value:
          "The complete risk register below details each identified risk with its " +
          "probability, impact, composite score, mitigation strategy, and current status.",
      },
      { type: "spacer", height: 6 },
    ];

    if (data.risks.length > 0) {
      registerContent.push({
        type: "table",
        headers: [
          "Risk",
          "Category",
          "Probability",
          "Impact",
          "Score",
          "Mitigation Status",
        ],
        rows: data.risks.map((r) => [
          r.title,
          r.category,
          r.probability,
          r.impact,
          String(r.riskScore),
          r.mitigationStatus,
        ]),
      });
    } else {
      registerContent.push({
        type: "text",
        value: "No risks have been identified at this time.",
      });
    }

    sections.push({
      title: `${nextSection()}. Risk Register`,
      content: registerContent,
    });
  }

  // ── 4. Category Analysis ───────────────────────────────────────────────

  {
    const grouped = groupRisksByCategory(data.risks);
    const categoryContent: ReportSectionContent[] = [
      {
        type: "text",
        value:
          "Risks are grouped by category to identify areas of concentration and " +
          "to support targeted mitigation planning.",
      },
      { type: "spacer", height: 6 },
    ];

    // Summary table of categories
    const categoryRows: string[][] = [];
    for (const [category, risks] of grouped) {
      const avgScore =
        risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length;
      const mitigatedCount = risks.filter(
        (r) =>
          r.mitigationStatus.toLowerCase() === "mitigated" ||
          r.mitigationStatus.toLowerCase() === "resolved",
      ).length;
      categoryRows.push([
        category,
        String(risks.length),
        avgScore.toFixed(1),
        `${mitigatedCount}/${risks.length}`,
      ]);
    }

    categoryContent.push({
      type: "table",
      headers: ["Category", "Risk Count", "Avg. Score", "Mitigated"],
      rows: categoryRows,
    });

    // Detailed per-category breakdown
    for (const [category, risks] of grouped) {
      categoryContent.push(
        { type: "spacer", height: 8 },
        { type: "heading", value: category, level: 2 },
      );

      for (const risk of risks) {
        const items: Array<{ key: string; value: string }> = [
          { key: "Risk", value: risk.title },
          { key: "Probability", value: risk.probability },
          { key: "Impact", value: risk.impact },
          { key: "Risk Score", value: String(risk.riskScore) },
          { key: "Mitigation Status", value: risk.mitigationStatus },
        ];

        if (risk.mitigationStrategy) {
          items.push({
            key: "Mitigation Strategy",
            value: risk.mitigationStrategy,
          });
        }

        if (risk.financialExposure != null) {
          items.push({
            key: "Financial Exposure",
            value: formatEUR(risk.financialExposure),
          });
        }

        if (risk.timeHorizon) {
          items.push({ key: "Time Horizon", value: risk.timeHorizon });
        }

        categoryContent.push({ type: "keyValue", items });
        categoryContent.push({ type: "divider" });
      }
    }

    sections.push({
      title: `${nextSection()}. Category Analysis`,
      content: categoryContent,
    });
  }

  // ── 5. Mitigation Coverage ─────────────────────────────────────────────

  {
    const mitigatedCount = data.risks.filter(
      (r) =>
        r.mitigationStatus.toLowerCase() === "mitigated" ||
        r.mitigationStatus.toLowerCase() === "resolved",
    ).length;
    const inProgressCount = data.risks.filter(
      (r) => r.mitigationStatus.toLowerCase() === "in progress",
    ).length;
    const pendingCount = data.risks.filter(
      (r) =>
        r.mitigationStatus.toLowerCase() === "pending" ||
        r.mitigationStatus.toLowerCase() === "open",
    ).length;
    const unmitigatedCount =
      totalRisks - mitigatedCount - inProgressCount - pendingCount;

    const coverageContent: ReportSectionContent[] = [
      {
        type: "text",
        value:
          `Overall mitigation coverage is ${formatFraction(data.mitigationCoverage)}. ` +
          "The table below breaks down risk mitigation by status.",
      },
      { type: "spacer", height: 6 },
      {
        type: "table",
        headers: ["Mitigation Status", "Count", "Percentage"],
        rows: [
          [
            "Mitigated / Resolved",
            String(mitigatedCount),
            totalRisks > 0
              ? `${((mitigatedCount / totalRisks) * 100).toFixed(1)}%`
              : "0%",
          ],
          [
            "In Progress",
            String(inProgressCount),
            totalRisks > 0
              ? `${((inProgressCount / totalRisks) * 100).toFixed(1)}%`
              : "0%",
          ],
          [
            "Pending / Open",
            String(pendingCount),
            totalRisks > 0
              ? `${((pendingCount / totalRisks) * 100).toFixed(1)}%`
              : "0%",
          ],
          ...(unmitigatedCount > 0
            ? [
                [
                  "Other",
                  String(unmitigatedCount),
                  `${((unmitigatedCount / totalRisks) * 100).toFixed(1)}%`,
                ],
              ]
            : []),
        ],
      },
    ];

    if (data.mitigationCoverage < 0.5) {
      coverageContent.push(
        { type: "spacer", height: 6 },
        {
          type: "alert",
          severity: "warning",
          message:
            "Mitigation coverage is below 50%. It is strongly recommended to develop " +
            "and implement mitigation strategies for all identified high and critical risks.",
        },
      );
    }

    sections.push({
      title: `${nextSection()}. Mitigation Coverage`,
      content: coverageContent,
    });
  }

  // ── 6. Scenario Analysis ───────────────────────────────────────────────

  if (data.scenarios && data.scenarios.length > 0) {
    const scenarioContent: ReportSectionContent[] = [
      {
        type: "text",
        value:
          "The following scenario analyses model the potential financial impact of " +
          "compound risk events across best-case, most-likely, and worst-case outcomes.",
      },
      { type: "spacer", height: 6 },
      {
        type: "table",
        headers: [
          "Scenario",
          "Best Case",
          "Most Likely",
          "Worst Case",
          "Risks Triggered",
        ],
        rows: data.scenarios.map((s) => [
          s.name,
          formatEUR(s.financialImpact.bestCase),
          formatEUR(s.financialImpact.mostLikely),
          formatEUR(s.financialImpact.worstCase),
          String(s.triggeredRisks),
        ]),
      },
    ];

    // Detailed scenario descriptions
    for (const scenario of data.scenarios) {
      scenarioContent.push(
        { type: "spacer", height: 8 },
        { type: "heading", value: scenario.name, level: 3 },
        { type: "text", value: scenario.description },
      );
    }

    sections.push({
      title: `${nextSection()}. Scenario Analysis`,
      content: scenarioContent,
    });
  }

  // ── 7. Financial Exposure Summary ──────────────────────────────────────

  {
    const risksWithExposure = data.risks.filter(
      (r) => r.financialExposure != null,
    );
    const exposureContent: ReportSectionContent[] = [];

    if (data.totalFinancialExposure != null) {
      exposureContent.push({
        type: "keyValue",
        items: [
          {
            key: "Total Financial Exposure",
            value: formatEUR(data.totalFinancialExposure),
          },
          {
            key: "Risks with Quantified Exposure",
            value: `${risksWithExposure.length} of ${totalRisks}`,
          },
        ],
      });
    }

    if (risksWithExposure.length > 0) {
      // Sort by financial exposure descending
      const sorted = [...risksWithExposure].sort(
        (a, b) => (b.financialExposure || 0) - (a.financialExposure || 0),
      );

      exposureContent.push(
        { type: "spacer", height: 8 },
        { type: "heading", value: "Top Financial Exposures", level: 3 },
        {
          type: "table",
          headers: ["Risk", "Category", "Financial Exposure", "Score"],
          rows: sorted
            .slice(0, 10)
            .map((r) => [
              r.title,
              r.category,
              formatEUR(r.financialExposure),
              String(r.riskScore),
            ]),
        },
      );
    } else {
      exposureContent.push({
        type: "text",
        value:
          "No risks have quantified financial exposure data at this time. " +
          "It is recommended to estimate financial exposure for high and critical risks.",
      });
    }

    sections.push({
      title: `${nextSection()}. Financial Exposure Summary`,
      content: exposureContent,
    });
  }

  // ── 8. Regulatory Risk Detail ──────────────────────────────────────────

  {
    const regContent: ReportSectionContent[] = [];

    if (data.regulatoryRisks && data.regulatoryRisks.length > 0) {
      regContent.push(
        {
          type: "text",
          value:
            "The following regulatory risks have been identified based on the company's " +
            "operational profile and applicable regulatory frameworks.",
        },
        { type: "spacer", height: 6 },
        {
          type: "table",
          headers: ["Regulatory Risk", "Status"],
          rows: data.regulatoryRisks.map((rr) => [rr.risk, rr.status]),
        },
      );
    } else {
      regContent.push({
        type: "text",
        value: "No specific regulatory risks have been flagged at this time.",
      });
    }

    if (data.complyVerified != null) {
      regContent.push(
        { type: "spacer", height: 6 },
        {
          type: "alert",
          severity: data.complyVerified ? "info" : "warning",
          message: data.complyVerified
            ? "Regulatory compliance has been verified through the Caelex Comply module."
            : "Regulatory compliance verification is pending via the Caelex Comply module.",
        },
      );
    }

    sections.push({
      title: `${nextSection()}. Regulatory Risk Detail`,
      content: regContent,
    });
  }

  // ── Disclaimer ─────────────────────────────────────────────────────────

  sections.push({
    title: `${nextSection()}. Disclaimer`,
    content: [
      {
        type: "text",
        value:
          `This Risk Analysis Report was generated by the Caelex Assure platform on ${formatDate(now)}. ` +
          "Risk assessments are based on self-reported data and algorithmic analysis. " +
          "Actual outcomes may differ materially from the projections and assessments " +
          "presented herein.",
      },
      { type: "spacer", height: 8 },
      {
        type: "alert",
        severity: "info",
        message:
          "This report does not constitute legal, financial, or insurance advice. " +
          "Organizations should consult qualified professionals for risk management " +
          "decisions with material financial or regulatory implications.",
      },
    ],
  });

  // ── Assemble ReportConfig ──────────────────────────────────────────────

  return {
    metadata: {
      reportId: generateReportId("RISK"),
      reportType: "assure_risk_report",
      title: `Risk Analysis Report - ${data.companyName}`,
      generatedAt: now,
      generatedBy: "Caelex Assure",
      organization: data.companyName,
    },
    header: {
      title: "Risk Analysis Report",
      subtitle: `${data.companyName} - Comprehensive Risk Assessment`,
      date: now,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice:
        "CONFIDENTIAL - This document contains proprietary risk assessment information. " +
        "Do not distribute without authorization from the issuing organization.",
      disclaimer:
        "This risk report is generated by the Caelex Assure platform based on " +
        "self-reported data and algorithmic analysis. It does not constitute legal, " +
        "financial, or insurance advice.",
    },
    sections,
  };
}
