/**
 * Investor Update Report Template — Caelex Assure
 *
 * Monthly or quarterly investor update template with key metrics,
 * milestone progress, financial summary, highlights, challenges, and asks.
 * Returns a ReportConfig JSON structure for client-side PDF rendering.
 */

import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "../types";
import {
  formatEUR,
  formatNumber,
  formatDate,
  trendIndicator,
  generateReportId,
} from "./format";

// ─── Input Data Shape ───────────────────────────────────────────────────────

export interface InvestorUpdateData {
  companyName: string;
  period: string; // e.g. "Q1 2026", "January 2026"
  periodType: "monthly" | "quarterly";

  // Metrics
  keyMetrics?: Array<{
    name: string;
    current: string;
    previous: string;
    trend: "up" | "down" | "flat";
  }>;

  // Milestones
  completedMilestones?: Array<{ title: string; date: string }>;
  upcomingMilestones?: Array<{
    title: string;
    targetDate: string;
    status: string;
  }>;

  // Financials
  revenue?: number;
  prevRevenue?: number;
  burnRate?: number;
  runway?: number;
  cashPosition?: number;

  // Highlights
  highlights?: string[];
  challenges?: string[];
  asks?: string[]; // What the CEO needs from investors
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function revenueGrowthText(
  current: number | undefined,
  previous: number | undefined,
): string {
  if (current == null || previous == null || previous === 0) return "N/A";
  const pct = ((current - previous) / previous) * 100;
  const direction = pct >= 0 ? "increase" : "decrease";
  return `${Math.abs(pct).toFixed(1)}% ${direction} from prior period`;
}

function periodLabel(periodType: "monthly" | "quarterly"): string {
  return periodType === "monthly" ? "Month" : "Quarter";
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildInvestorUpdateReport(
  data: InvestorUpdateData,
): ReportConfig {
  const now = new Date();
  const sections: ReportSection[] = [];
  let sectionNum = 0;

  const nextSection = (): string => {
    sectionNum++;
    return `${sectionNum}`;
  };

  // ── 1. Header / Overview ───────────────────────────────────────────────

  sections.push({
    title: `${nextSection()}. ${data.period} Update`,
    content: [
      {
        type: "heading",
        value: `${data.companyName} - Investor Update`,
        level: 1,
      },
      {
        type: "text",
        value:
          `${periodLabel(data.periodType)}ly update for ${data.period}. ` +
          `Report generated on ${formatDate(now)}.`,
      },
      { type: "spacer", height: 8 },
      {
        type: "keyValue",
        items: [
          { key: "Company", value: data.companyName },
          { key: "Period", value: data.period },
          {
            key: "Report Type",
            value: `${periodLabel(data.periodType)}ly Investor Update`,
          },
        ],
      },
    ],
  });

  // ── 2. Key Metrics ─────────────────────────────────────────────────────

  if (data.keyMetrics && data.keyMetrics.length > 0) {
    sections.push({
      title: `${nextSection()}. Key Metrics`,
      content: [
        {
          type: "text",
          value:
            "The following table summarizes key performance indicators for the period, " +
            "including comparison to the prior period and directional trends.",
        },
        { type: "spacer", height: 6 },
        {
          type: "table",
          headers: ["Metric", "Current", "Previous", "Trend"],
          rows: data.keyMetrics.map((m) => [
            m.name,
            m.current,
            m.previous,
            trendIndicator(m.trend),
          ]),
        },
      ],
    });
  }

  // ── 3. Milestone Progress ──────────────────────────────────────────────

  {
    const milestoneContent: ReportSectionContent[] = [];
    let hasMilestones = false;

    if (data.completedMilestones && data.completedMilestones.length > 0) {
      milestoneContent.push(
        { type: "heading", value: "Completed This Period", level: 2 },
        {
          type: "table",
          headers: ["Milestone", "Date Completed"],
          rows: data.completedMilestones.map((m) => [
            m.title,
            formatDate(m.date),
          ]),
        },
      );
      hasMilestones = true;
    }

    if (data.upcomingMilestones && data.upcomingMilestones.length > 0) {
      if (hasMilestones) {
        milestoneContent.push({ type: "spacer", height: 8 });
      }
      milestoneContent.push(
        { type: "heading", value: "Upcoming Milestones", level: 2 },
        {
          type: "table",
          headers: ["Milestone", "Target Date", "Status"],
          rows: data.upcomingMilestones.map((m) => [
            m.title,
            formatDate(m.targetDate),
            m.status,
          ]),
        },
      );
      hasMilestones = true;
    }

    if (hasMilestones) {
      sections.push({
        title: `${nextSection()}. Milestone Progress`,
        content: milestoneContent,
      });
    }
  }

  // ── 4. Financial Summary ───────────────────────────────────────────────

  {
    const finContent: ReportSectionContent[] = [];
    const finKV: Array<{ key: string; value: string }> = [];
    let hasFinancials = false;

    if (data.revenue != null) {
      finKV.push({ key: "Revenue", value: formatEUR(data.revenue) });
      hasFinancials = true;
    }
    if (data.prevRevenue != null) {
      finKV.push({
        key: "Previous Period Revenue",
        value: formatEUR(data.prevRevenue),
      });
    }
    if (data.revenue != null && data.prevRevenue != null) {
      finKV.push({
        key: "Revenue Growth",
        value: revenueGrowthText(data.revenue, data.prevRevenue),
      });
    }
    if (data.burnRate != null) {
      finKV.push({
        key: "Monthly Burn Rate",
        value: formatEUR(data.burnRate),
      });
      hasFinancials = true;
    }
    if (data.cashPosition != null) {
      finKV.push({
        key: "Cash Position",
        value: formatEUR(data.cashPosition),
      });
      hasFinancials = true;
    }
    if (data.runway != null) {
      finKV.push({
        key: "Runway",
        value: `${data.runway} months`,
      });
      hasFinancials = true;
    }

    if (hasFinancials) {
      finContent.push({ type: "keyValue", items: finKV });

      // Add a runway alert if it's low
      if (data.runway != null && data.runway <= 6) {
        finContent.push(
          { type: "spacer", height: 6 },
          {
            type: "alert",
            severity: data.runway <= 3 ? "error" : "warning",
            message:
              data.runway <= 3
                ? `Runway is critically low at ${data.runway} months. Immediate fundraising or cost reduction action is required.`
                : `Runway is ${data.runway} months. Planning for next fundraise should be underway.`,
          },
        );
      }

      sections.push({
        title: `${nextSection()}. Financial Summary`,
        content: finContent,
      });
    }
  }

  // ── 5. Highlights & Wins ───────────────────────────────────────────────

  if (data.highlights && data.highlights.length > 0) {
    sections.push({
      title: `${nextSection()}. Highlights & Wins`,
      content: [
        {
          type: "text",
          value: `Key accomplishments and positive developments during ${data.period}:`,
        },
        { type: "spacer", height: 4 },
        { type: "list", items: data.highlights, ordered: false },
      ],
    });
  }

  // ── 6. Challenges ──────────────────────────────────────────────────────

  if (data.challenges && data.challenges.length > 0) {
    sections.push({
      title: `${nextSection()}. Challenges`,
      content: [
        {
          type: "text",
          value: `Key challenges and obstacles encountered during ${data.period}:`,
        },
        { type: "spacer", height: 4 },
        { type: "list", items: data.challenges, ordered: false },
      ],
    });
  }

  // ── 7. Asks ────────────────────────────────────────────────────────────

  if (data.asks && data.asks.length > 0) {
    sections.push({
      title: `${nextSection()}. Asks`,
      content: [
        {
          type: "text",
          value:
            "The following are areas where we would appreciate support or introductions " +
            "from our investor network:",
        },
        { type: "spacer", height: 4 },
        { type: "list", items: data.asks, ordered: true },
      ],
    });
  }

  // ── 8. Looking Ahead ───────────────────────────────────────────────────

  {
    const lookAheadContent: ReportSectionContent[] = [
      {
        type: "text",
        value:
          `Looking ahead to the next ${data.periodType === "monthly" ? "month" : "quarter"}, ` +
          "the team is focused on the following priorities:",
      },
    ];

    // Pull upcoming milestones as forward-looking priorities
    if (data.upcomingMilestones && data.upcomingMilestones.length > 0) {
      lookAheadContent.push(
        { type: "spacer", height: 4 },
        {
          type: "list",
          items: data.upcomingMilestones.map(
            (m) =>
              `${m.title} (target: ${formatDate(m.targetDate)}) - ${m.status}`,
          ),
          ordered: false,
        },
      );
    } else {
      lookAheadContent.push({
        type: "text",
        value:
          "Detailed priorities and milestones for the upcoming period will be shared " +
          "in the next update.",
      });
    }

    sections.push({
      title: `${nextSection()}. Looking Ahead`,
      content: lookAheadContent,
    });
  }

  // ── Assemble ReportConfig ──────────────────────────────────────────────

  return {
    metadata: {
      reportId: generateReportId("UPDATE"),
      reportType: "investor_update",
      title: `Investor Update - ${data.companyName} - ${data.period}`,
      generatedAt: now,
      generatedBy: "Caelex Assure",
      organization: data.companyName,
    },
    header: {
      title: `${periodLabel(data.periodType)}ly Investor Update`,
      subtitle: `${data.companyName} - ${data.period}`,
      date: now,
      logo: true,
    },
    footer: {
      pageNumbers: true,
      confidentialityNotice:
        "CONFIDENTIAL - This investor update contains proprietary financial and " +
        "operational information. It is intended solely for existing investors and " +
        "authorized recipients. Do not forward or distribute without written consent.",
      disclaimer:
        "This investor update is generated by the Caelex Assure platform based on " +
        "self-reported data. Forward-looking statements are not guarantees of future " +
        "performance. Past results are not indicative of future outcomes.",
    },
    sections,
  };
}
