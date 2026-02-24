/**
 * Executive Summary Report Template — Caelex Assure
 *
 * One-page overview of a company for quick investor or stakeholder consumption.
 * Returns a ReportConfig JSON structure for client-side PDF rendering.
 */

import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "../types";
import {
  formatEUR,
  formatEURCompact,
  formatPercent,
  formatDate,
  formatNumber,
  generateReportId,
} from "./format";

// ─── Input Data Shape ───────────────────────────────────────────────────────

export interface ExecutiveSummaryData {
  companyName: string;
  oneLiner: string;
  stage: string;
  operatorType: string[];
  subsector: string[];

  // Key metrics
  teamSize?: number;
  annualRevenue?: number;
  totalRaised?: number;
  runway?: number;

  // IRS
  irsGrade?: string;
  irsScore?: number;

  // Market
  tamValue?: number;
  samValue?: number;
  somValue?: number;

  // Raise
  isRaising?: boolean;
  targetRaise?: number;
  roundType?: string;
  useOfFunds?: Array<{ category: string; percentage: number }>;

  // Advantages
  topAdvantages?: string[];

  // Milestones
  recentMilestones?: Array<{ title: string; date: string }>;
  upcomingMilestones?: Array<{ title: string; date: string }>;

  // Contact
  website?: string;
  headquarters?: string;
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildExecutiveSummaryReport(
  data: ExecutiveSummaryData,
): ReportConfig {
  const now = new Date();
  const sections: ReportSection[] = [];

  // ── 1. Company Header ──────────────────────────────────────────────────

  sections.push({
    title: "1. Company Overview",
    content: [
      { type: "heading", value: data.companyName, level: 1 },
      { type: "text", value: data.oneLiner },
      { type: "spacer", height: 8 },
      {
        type: "keyValue",
        items: [
          { key: "Stage", value: data.stage },
          {
            key: "Operator Type",
            value: data.operatorType.join(", ") || "N/A",
          },
          { key: "Subsector", value: data.subsector.join(", ") || "N/A" },
          ...(data.irsGrade
            ? [
                {
                  key: "IRS Grade",
                  value: `${data.irsGrade}${data.irsScore != null ? ` (${data.irsScore}/100)` : ""}`,
                },
              ]
            : []),
          ...(data.headquarters
            ? [{ key: "Headquarters", value: data.headquarters }]
            : []),
        ],
      },
    ],
  });

  // ── 2. Key Metrics ─────────────────────────────────────────────────────

  const metricsRows: string[][] = [];
  if (data.teamSize != null) {
    metricsRows.push(["Team Size", formatNumber(data.teamSize)]);
  }
  if (data.annualRevenue != null) {
    metricsRows.push(["Annual Revenue", formatEUR(data.annualRevenue)]);
  }
  if (data.totalRaised != null) {
    metricsRows.push(["Total Raised", formatEUR(data.totalRaised)]);
  }
  if (data.runway != null) {
    metricsRows.push(["Runway", `${data.runway} months`]);
  }

  if (metricsRows.length > 0) {
    sections.push({
      title: "2. Key Metrics",
      content: [
        {
          type: "table",
          headers: ["Metric", "Value"],
          rows: metricsRows,
        },
      ],
    });
  }

  // ── 3. Market Overview ─────────────────────────────────────────────────

  if (data.tamValue != null || data.samValue != null || data.somValue != null) {
    const marketContent: ReportSectionContent[] = [
      {
        type: "table",
        headers: ["Market Segment", "Value"],
        rows: [
          ...(data.tamValue != null
            ? [
                [
                  "Total Addressable Market (TAM)",
                  formatEURCompact(data.tamValue),
                ],
              ]
            : []),
          ...(data.samValue != null
            ? [
                [
                  "Serviceable Addressable Market (SAM)",
                  formatEURCompact(data.samValue),
                ],
              ]
            : []),
          ...(data.somValue != null
            ? [
                [
                  "Serviceable Obtainable Market (SOM)",
                  formatEURCompact(data.somValue),
                ],
              ]
            : []),
        ],
      },
    ];

    sections.push({
      title: "3. Market Overview",
      content: marketContent,
    });
  }

  // ── 4. Current Raise ───────────────────────────────────────────────────

  if (data.isRaising) {
    const raiseContent: ReportSectionContent[] = [
      {
        type: "keyValue",
        items: [
          { key: "Status", value: "Currently Raising" },
          ...(data.targetRaise != null
            ? [{ key: "Target Raise", value: formatEUR(data.targetRaise) }]
            : []),
          ...(data.roundType
            ? [{ key: "Round Type", value: data.roundType }]
            : []),
        ],
      },
    ];

    if (data.useOfFunds && data.useOfFunds.length > 0) {
      raiseContent.push(
        { type: "spacer", height: 8 },
        { type: "heading", value: "Use of Funds", level: 3 },
        {
          type: "table",
          headers: ["Category", "Allocation"],
          rows: data.useOfFunds.map((u) => [
            u.category,
            formatPercent(u.percentage),
          ]),
        },
      );
    }

    sections.push({
      title: "4. Current Raise",
      content: raiseContent,
    });
  }

  // ── 5. Top Advantages ──────────────────────────────────────────────────

  if (data.topAdvantages && data.topAdvantages.length > 0) {
    sections.push({
      title: "5. Top Advantages",
      content: [
        {
          type: "list",
          items: data.topAdvantages,
          ordered: false,
        },
      ],
    });
  }

  // ── 6. Milestones ──────────────────────────────────────────────────────

  const milestoneContent: ReportSectionContent[] = [];

  if (data.recentMilestones && data.recentMilestones.length > 0) {
    milestoneContent.push(
      { type: "heading", value: "Recent Milestones", level: 3 },
      {
        type: "table",
        headers: ["Milestone", "Date"],
        rows: data.recentMilestones.map((m) => [m.title, formatDate(m.date)]),
      },
    );
  }

  if (data.upcomingMilestones && data.upcomingMilestones.length > 0) {
    milestoneContent.push(
      { type: "spacer", height: 8 },
      { type: "heading", value: "Upcoming Milestones", level: 3 },
      {
        type: "table",
        headers: ["Milestone", "Target Date"],
        rows: data.upcomingMilestones.map((m) => [m.title, formatDate(m.date)]),
      },
    );
  }

  if (milestoneContent.length > 0) {
    sections.push({
      title: "6. Milestones",
      content: milestoneContent,
    });
  }

  // ── 7. Contact ─────────────────────────────────────────────────────────

  const contactItems: Array<{ key: string; value: string }> = [];
  if (data.website) {
    contactItems.push({ key: "Website", value: data.website });
  }
  if (data.headquarters) {
    contactItems.push({ key: "Headquarters", value: data.headquarters });
  }

  if (contactItems.length > 0) {
    sections.push({
      title: "7. Contact",
      content: [{ type: "keyValue", items: contactItems }],
    });
  }

  // ── Assemble ReportConfig ──────────────────────────────────────────────

  return {
    metadata: {
      reportId: generateReportId("EXEC"),
      reportType: "executive_summary",
      title: `Executive Summary - ${data.companyName}`,
      generatedAt: now,
      generatedBy: "Caelex Assure",
      organization: data.companyName,
    },
    header: {
      title: "Executive Summary",
      subtitle: `${data.companyName} - ${data.oneLiner}`,
      date: now,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice:
        "CONFIDENTIAL - This document contains proprietary business information. " +
        "Do not distribute without authorization from the issuing organization.",
      disclaimer:
        "This executive summary is generated by the Caelex Assure platform based on " +
        "self-reported data. It does not constitute investment advice or a binding " +
        "valuation opinion.",
    },
    sections,
  };
}
