/**
 * Company Profile Report Template — Caelex Assure
 *
 * Full 10-15 page company profile for comprehensive due diligence.
 * Extends the investment teaser with competitive landscape, full risk
 * register, IP portfolio, partnerships, traction metrics, full financials,
 * and funding history.
 * Returns a ReportConfig JSON structure for client-side PDF rendering.
 */

import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "../types";
import type { InvestmentTeaserData } from "./investment-teaser";
import {
  formatEUR,
  formatEURCompact,
  formatPercent,
  formatDate,
  formatNumber,
  generateReportId,
} from "./format";

// ─── Input Data Shape ───────────────────────────────────────────────────────

export interface CompanyProfileData extends InvestmentTeaserData {
  competitors?: Array<{
    name: string;
    strengths: string;
    weaknesses: string;
    differentiation: string;
  }>;

  allRisks?: Array<{
    title: string;
    category: string;
    probability: string;
    impact: string;
    riskScore: number;
    mitigation: string;
    status: string;
  }>;

  patents?: { filed: number; granted: number; descriptions: string[] };
  ipStrategy?: string;

  partnerships?: Array<{
    partner: string;
    type: string;
    value?: number;
    status: string;
  }>;

  awards?: Array<{ name: string; date: string; issuer: string }>;

  keyMetrics?: Array<{ name: string; value: string; trend: string }>;

  fundingRounds?: Array<{
    round: string;
    date: string;
    amount: number;
    valuation: number;
    leadInvestor: string;
  }>;

  unitEconomics?: Array<{ metric: string; value: string }>;
}

// ─── TRL Description Helper ─────────────────────────────────────────────────

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

export function buildCompanyProfileReport(
  data: CompanyProfileData,
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
            {
              type: "heading" as const,
              value: "Mission Statement",
              level: 3 as const,
            },
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

  // ── 6. Competitive Landscape ───────────────────────────────────────────

  if (data.competitors && data.competitors.length > 0) {
    sections.push({
      title: `${nextSection()}. Competitive Landscape`,
      content: [
        {
          type: "text",
          value:
            "The following table presents an analysis of the competitive environment, " +
            "highlighting key competitors, their strengths and weaknesses, and the " +
            "company's points of differentiation.",
        },
        { type: "spacer", height: 6 },
        {
          type: "table",
          headers: [
            "Competitor",
            "Strengths",
            "Weaknesses",
            "Our Differentiation",
          ],
          rows: data.competitors.map((c) => [
            c.name,
            c.strengths,
            c.weaknesses,
            c.differentiation,
          ]),
        },
      ],
    });
  }

  // ── 7. Team ────────────────────────────────────────────────────────────

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

  // ── 8. Full Financial Detail ───────────────────────────────────────────

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

    if (data.unitEconomics && data.unitEconomics.length > 0) {
      finContent.push(
        { type: "spacer", height: 6 },
        { type: "heading", value: "Unit Economics", level: 3 },
        {
          type: "table",
          headers: ["Metric", "Value"],
          rows: data.unitEconomics.map((ue) => [ue.metric, ue.value]),
        },
      );
      hasFinancials = true;
    }

    if (hasFinancials) {
      sections.push({
        title: `${nextSection()}. Financial Detail`,
        content: finContent,
      });
    }
  }

  // ── 9. Funding History ─────────────────────────────────────────────────

  if (data.fundingRounds && data.fundingRounds.length > 0) {
    sections.push({
      title: `${nextSection()}. Funding History`,
      content: [
        {
          type: "table",
          headers: ["Round", "Date", "Amount", "Valuation", "Lead Investor"],
          rows: data.fundingRounds.map((fr) => [
            fr.round,
            formatDate(fr.date),
            formatEUR(fr.amount),
            formatEUR(fr.valuation),
            fr.leadInvestor,
          ]),
        },
      ],
    });
  }

  // ── 10. Current Raise & Use of Funds ───────────────────────────────────

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

  // ── 11. Full Risk Register ─────────────────────────────────────────────

  if (data.allRisks && data.allRisks.length > 0) {
    const criticalCount = data.allRisks.filter(
      (r) =>
        r.probability.toLowerCase() === "high" &&
        r.impact.toLowerCase() === "high",
    ).length;

    const riskContent: ReportSectionContent[] = [];

    if (criticalCount > 0) {
      riskContent.push({
        type: "alert",
        severity: "error",
        message: `${criticalCount} risk${criticalCount > 1 ? "s" : ""} identified with high probability and high impact requiring immediate attention.`,
      });
      riskContent.push({ type: "spacer", height: 6 });
    }

    riskContent.push({
      type: "table",
      headers: [
        "Risk",
        "Category",
        "Probability",
        "Impact",
        "Score",
        "Mitigation",
        "Status",
      ],
      rows: data.allRisks.map((r) => [
        r.title,
        r.category,
        r.probability,
        r.impact,
        String(r.riskScore),
        r.mitigation,
        r.status,
      ]),
    });

    sections.push({
      title: `${nextSection()}. Full Risk Register`,
      content: riskContent,
    });
  } else if (data.topRisks && data.topRisks.length > 0) {
    // Fall back to top risks from teaser data
    sections.push({
      title: `${nextSection()}. Key Risks`,
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

  // ── 12. Regulatory Position ────────────────────────────────────────────

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

  // ── 13. IP Portfolio ───────────────────────────────────────────────────

  if (data.patents || data.ipStrategy) {
    const ipContent: ReportSectionContent[] = [];

    if (data.patents) {
      ipContent.push({
        type: "keyValue",
        items: [
          { key: "Patents Filed", value: formatNumber(data.patents.filed) },
          { key: "Patents Granted", value: formatNumber(data.patents.granted) },
        ],
      });

      if (data.patents.descriptions.length > 0) {
        ipContent.push(
          { type: "spacer", height: 6 },
          { type: "heading", value: "Patent Descriptions", level: 3 },
          { type: "list", items: data.patents.descriptions, ordered: true },
        );
      }
    }

    if (data.ipStrategy) {
      ipContent.push(
        { type: "spacer", height: 6 },
        { type: "heading", value: "IP Strategy", level: 3 },
        { type: "text", value: data.ipStrategy },
      );
    }

    sections.push({
      title: `${nextSection()}. IP Portfolio`,
      content: ipContent,
    });
  }

  // ── 14. Partnerships & Contracts ───────────────────────────────────────

  if (data.partnerships && data.partnerships.length > 0) {
    sections.push({
      title: `${nextSection()}. Partnerships & Contracts`,
      content: [
        {
          type: "table",
          headers: ["Partner", "Type", "Value", "Status"],
          rows: data.partnerships.map((p) => [
            p.partner,
            p.type,
            p.value != null ? formatEUR(p.value) : "N/A",
            p.status,
          ]),
        },
      ],
    });
  }

  // ── 15. Awards & Recognition ───────────────────────────────────────────

  if (data.awards && data.awards.length > 0) {
    sections.push({
      title: `${nextSection()}. Awards & Recognition`,
      content: [
        {
          type: "table",
          headers: ["Award", "Date", "Issuer"],
          rows: data.awards.map((a) => [a.name, formatDate(a.date), a.issuer]),
        },
      ],
    });
  }

  // ── 16. Traction & Metrics ─────────────────────────────────────────────

  if (data.keyMetrics && data.keyMetrics.length > 0) {
    sections.push({
      title: `${nextSection()}. Traction & Metrics`,
      content: [
        {
          type: "table",
          headers: ["Metric", "Value", "Trend"],
          rows: data.keyMetrics.map((m) => [m.name, m.value, m.trend]),
        },
      ],
    });
  }

  // ── 17. Top Advantages ─────────────────────────────────────────────────

  if (data.topAdvantages && data.topAdvantages.length > 0) {
    sections.push({
      title: `${nextSection()}. Competitive Advantages`,
      content: [{ type: "list", items: data.topAdvantages, ordered: false }],
    });
  }

  // ── 18. Milestones ─────────────────────────────────────────────────────

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

  // ── 19. Appendices ─────────────────────────────────────────────────────

  {
    const appendixContent: ReportSectionContent[] = [
      {
        type: "text",
        value:
          "This company profile was generated by the Caelex Assure platform. All data " +
          "presented is based on information self-reported by the company and verified " +
          "where possible through the Caelex compliance engine.",
      },
      { type: "spacer", height: 8 },
      {
        type: "keyValue",
        items: [
          { key: "Report Generated", value: formatDate(now) },
          { key: "Platform", value: "Caelex Assure" },
          {
            key: "Data Sources",
            value: "Self-reported, Caelex Comply module verification",
          },
        ],
      },
      { type: "spacer", height: 8 },
      {
        type: "alert",
        severity: "info",
        message:
          "This document is generated for informational purposes only. It does not " +
          "constitute investment advice, a securities offering, or a binding valuation " +
          "opinion. Readers should conduct their own independent due diligence before " +
          "making any investment decisions.",
      },
    ];

    sections.push({
      title: `${nextSection()}. Appendices`,
      content: appendixContent,
    });
  }

  // ── Assemble ReportConfig ──────────────────────────────────────────────

  return {
    metadata: {
      reportId: generateReportId("PROFILE"),
      reportType: "assure_company_profile",
      title: `Company Profile - ${data.companyName}`,
      generatedAt: now,
      generatedBy: "Caelex Assure",
      organization: data.companyName,
    },
    header: {
      title: "Company Profile",
      subtitle: `${data.companyName} - Comprehensive Due Diligence Report`,
      date: now,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice:
        "STRICTLY CONFIDENTIAL - This document contains proprietary business, financial, " +
        "and intellectual property information. Unauthorized reproduction or distribution " +
        "is prohibited. This document is intended solely for the named recipient(s).",
      disclaimer:
        "This company profile is generated by the Caelex Assure platform based on " +
        "self-reported data and automated compliance analysis. It does not constitute " +
        "investment advice, a securities offering, or a binding valuation opinion. " +
        "Past performance is not indicative of future results.",
    },
    sections,
  };
}
