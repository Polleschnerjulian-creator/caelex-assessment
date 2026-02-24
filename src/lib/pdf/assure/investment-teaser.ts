/**
 * Investment Teaser Report Template — Caelex Assure
 *
 * 3-5 page teaser document for potential investors. Extends the executive
 * summary with problem/solution, technology, team, financials, and risks.
 * Returns a ReportConfig JSON structure for client-side PDF rendering.
 */

import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "../types";
import type { ExecutiveSummaryData } from "./executive-summary";
import {
  formatEUR,
  formatEURCompact,
  formatPercent,
  formatDate,
  formatNumber,
  generateReportId,
} from "./format";

// ─── Input Data Shape ───────────────────────────────────────────────────────

export interface InvestmentTeaserData extends ExecutiveSummaryData {
  problemStatement?: string;
  solutionStatement?: string;
  missionStatement?: string;

  productName?: string;
  productDescription?: string;
  trlLevel?: number;
  productStatus?: string;

  founders?: Array<{ name: string; role: string; background: string }>;
  boardMembers?: Array<{ name: string; affiliation: string }>;

  revenueModel?: string;
  revenueStreams?: Array<{
    stream: string;
    percentage: number;
    recurring: boolean;
  }>;
  revenueProjections?: Array<{ year: number; revenue: number }>;

  topRisks?: Array<{ title: string; severity: string; mitigation: string }>;

  regulatoryStatus?: string;
  complyVerified?: boolean;
}

// ─── TRL Badge Helper ───────────────────────────────────────────────────────

function trlDescription(level: number): string {
  const descriptions: Record<number, string> = {
    1: "Basic principles observed",
    2: "Technology concept formulated",
    3: "Experimental proof of concept",
    4: "Technology validated in lab",
    5: "Technology validated in relevant environment",
    6: "Technology demonstrated in relevant environment",
    7: "System prototype demonstration in operational environment",
    8: "System complete and qualified",
    9: "Actual system proven in operational environment",
  };
  return descriptions[level] || "Unknown TRL level";
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildInvestmentTeaserReport(
  data: InvestmentTeaserData,
): ReportConfig {
  const now = new Date();
  const sections: ReportSection[] = [];
  let sectionNum = 0;

  const nextSection = (): string => {
    sectionNum++;
    return `${sectionNum}`;
  };

  // ── 1. Company Overview ────────────────────────────────────────────────

  const overviewItems: Array<{ key: string; value: string }> = [
    { key: "Stage", value: data.stage },
    { key: "Operator Type", value: data.operatorType.join(", ") || "N/A" },
    { key: "Subsector", value: data.subsector.join(", ") || "N/A" },
  ];

  if (data.irsGrade) {
    overviewItems.push({
      key: "IRS Grade",
      value: `${data.irsGrade}${data.irsScore != null ? ` (${data.irsScore}/100)` : ""}`,
    });
  }
  if (data.headquarters) {
    overviewItems.push({ key: "Headquarters", value: data.headquarters });
  }
  if (data.website) {
    overviewItems.push({ key: "Website", value: data.website });
  }

  sections.push({
    title: `${nextSection()}. Company Overview`,
    content: [
      { type: "heading", value: data.companyName, level: 1 },
      { type: "text", value: data.oneLiner },
      ...(data.missionStatement
        ? [
            { type: "spacer" as const, height: 6 },
            { type: "heading" as const, value: "Mission", level: 3 as const },
            { type: "text" as const, value: data.missionStatement },
          ]
        : []),
      { type: "spacer", height: 8 },
      { type: "keyValue", items: overviewItems },
    ],
  });

  // ── 2. Key Metrics ─────────────────────────────────────────────────────

  const metricsRows: string[][] = [];
  if (data.teamSize != null)
    metricsRows.push(["Team Size", formatNumber(data.teamSize)]);
  if (data.annualRevenue != null)
    metricsRows.push(["Annual Revenue", formatEUR(data.annualRevenue)]);
  if (data.totalRaised != null)
    metricsRows.push(["Total Raised", formatEUR(data.totalRaised)]);
  if (data.runway != null)
    metricsRows.push(["Runway", `${data.runway} months`]);

  if (metricsRows.length > 0) {
    sections.push({
      title: `${nextSection()}. Key Metrics`,
      content: [
        { type: "table", headers: ["Metric", "Value"], rows: metricsRows },
      ],
    });
  }

  // ── 3. Problem & Solution ──────────────────────────────────────────────

  if (data.problemStatement || data.solutionStatement) {
    const psContent: ReportSectionContent[] = [];

    if (data.problemStatement) {
      psContent.push(
        { type: "heading", value: "The Problem", level: 2 },
        { type: "text", value: data.problemStatement },
      );
    }

    if (data.solutionStatement) {
      psContent.push(
        { type: "spacer", height: 8 },
        { type: "heading", value: "Our Solution", level: 2 },
        { type: "text", value: data.solutionStatement },
      );
    }

    sections.push({
      title: `${nextSection()}. Problem & Solution`,
      content: psContent,
    });
  }

  // ── 4. Technology Overview ─────────────────────────────────────────────

  if (data.productName || data.trlLevel != null) {
    const techContent: ReportSectionContent[] = [];

    if (data.productName) {
      techContent.push({ type: "heading", value: data.productName, level: 2 });
    }

    if (data.productDescription) {
      techContent.push({ type: "text", value: data.productDescription });
    }

    const techKV: Array<{ key: string; value: string }> = [];
    if (data.trlLevel != null) {
      techKV.push({
        key: "Technology Readiness Level",
        value: `TRL ${data.trlLevel} - ${trlDescription(data.trlLevel)}`,
      });
    }
    if (data.productStatus) {
      techKV.push({ key: "Product Status", value: data.productStatus });
    }

    if (techKV.length > 0) {
      techContent.push(
        { type: "spacer", height: 6 },
        { type: "keyValue", items: techKV },
      );
    }

    sections.push({
      title: `${nextSection()}. Technology Overview`,
      content: techContent,
    });
  }

  // ── 5. Market Overview ─────────────────────────────────────────────────

  if (data.tamValue != null || data.samValue != null || data.somValue != null) {
    sections.push({
      title: `${nextSection()}. Market Overview`,
      content: [
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
      ],
    });
  }

  // ── 6. Team Profiles ───────────────────────────────────────────────────

  if (
    (data.founders && data.founders.length > 0) ||
    (data.boardMembers && data.boardMembers.length > 0)
  ) {
    const teamContent: ReportSectionContent[] = [];

    if (data.founders && data.founders.length > 0) {
      teamContent.push(
        { type: "heading", value: "Founders & Leadership", level: 2 },
        {
          type: "table",
          headers: ["Name", "Role", "Background"],
          rows: data.founders.map((f) => [f.name, f.role, f.background]),
        },
      );
    }

    if (data.boardMembers && data.boardMembers.length > 0) {
      teamContent.push(
        { type: "spacer", height: 8 },
        { type: "heading", value: "Board Members", level: 2 },
        {
          type: "table",
          headers: ["Name", "Affiliation"],
          rows: data.boardMembers.map((b) => [b.name, b.affiliation]),
        },
      );
    }

    sections.push({
      title: `${nextSection()}. Team`,
      content: teamContent,
    });
  }

  // ── 7. Financial Summary ───────────────────────────────────────────────

  {
    const finContent: ReportSectionContent[] = [];
    let hasFinancials = false;

    if (data.revenueModel) {
      finContent.push(
        { type: "heading", value: "Revenue Model", level: 3 },
        { type: "text", value: data.revenueModel },
      );
      hasFinancials = true;
    }

    if (data.revenueStreams && data.revenueStreams.length > 0) {
      finContent.push(
        { type: "spacer", height: 6 },
        { type: "heading", value: "Revenue Streams", level: 3 },
        {
          type: "table",
          headers: ["Stream", "Share", "Recurring"],
          rows: data.revenueStreams.map((rs) => [
            rs.stream,
            formatPercent(rs.percentage),
            rs.recurring ? "Yes" : "No",
          ]),
        },
      );
      hasFinancials = true;
    }

    if (data.revenueProjections && data.revenueProjections.length > 0) {
      finContent.push(
        { type: "spacer", height: 6 },
        { type: "heading", value: "Revenue Projections", level: 3 },
        {
          type: "table",
          headers: ["Year", "Projected Revenue"],
          rows: data.revenueProjections.map((rp) => [
            String(rp.year),
            formatEUR(rp.revenue),
          ]),
        },
      );
      hasFinancials = true;
    }

    if (hasFinancials) {
      sections.push({
        title: `${nextSection()}. Financial Summary`,
        content: finContent,
      });
    }
  }

  // ── 8. Current Raise & Use of Funds ────────────────────────────────────

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
      title: `${nextSection()}. Current Raise`,
      content: raiseContent,
    });
  }

  // ── 9. Regulatory Position ─────────────────────────────────────────────

  if (data.regulatoryStatus || data.complyVerified != null) {
    const regContent: ReportSectionContent[] = [];

    if (data.regulatoryStatus) {
      regContent.push({ type: "text", value: data.regulatoryStatus });
    }

    if (data.complyVerified != null) {
      regContent.push({
        type: "alert",
        severity: data.complyVerified ? "info" : "warning",
        message: data.complyVerified
          ? "Compliance verified through Caelex Comply module."
          : "Compliance verification pending via Caelex Comply module.",
      });
    }

    sections.push({
      title: `${nextSection()}. Regulatory Position`,
      content: regContent,
    });
  }

  // ── 10. Top Advantages ─────────────────────────────────────────────────

  if (data.topAdvantages && data.topAdvantages.length > 0) {
    sections.push({
      title: `${nextSection()}. Top Advantages`,
      content: [{ type: "list", items: data.topAdvantages, ordered: false }],
    });
  }

  // ── 11. Top Risks ──────────────────────────────────────────────────────

  if (data.topRisks && data.topRisks.length > 0) {
    sections.push({
      title: `${nextSection()}. Top Risks`,
      content: [
        {
          type: "table",
          headers: ["Risk", "Severity", "Mitigation"],
          rows: data.topRisks.map((r) => [
            r.title,
            r.severity.toUpperCase(),
            r.mitigation,
          ]),
        },
      ],
    });
  }

  // ── 12. Milestones ─────────────────────────────────────────────────────

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
      title: `${nextSection()}. Milestones`,
      content: milestoneContent,
    });
  }

  // ── Assemble ReportConfig ──────────────────────────────────────────────

  return {
    metadata: {
      reportId: generateReportId("TEASER"),
      reportType: "investment_teaser",
      title: `Investment Teaser - ${data.companyName}`,
      generatedAt: now,
      generatedBy: "Caelex Assure",
      organization: data.companyName,
    },
    header: {
      title: "Investment Teaser",
      subtitle: `${data.companyName} - ${data.oneLiner}`,
      date: now,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice:
        "STRICTLY CONFIDENTIAL - This document is intended solely for the named " +
        "recipient(s) and contains proprietary business and financial information. " +
        "Do not copy, forward, or distribute without written authorization.",
      disclaimer:
        "This investment teaser is generated by the Caelex Assure platform based on " +
        "self-reported data. It does not constitute investment advice, a securities " +
        "offering, or a binding valuation opinion. Past performance is not indicative " +
        "of future results.",
    },
    sections,
  };
}
