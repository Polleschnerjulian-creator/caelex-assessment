/**
 * CRA Compliance Summary Report
 *
 * Comprehensive compliance status report for Cyber Resilience Act assessments.
 * Shows executive summary, requirement breakdown, NIS2 overlap, conformity
 * route guidance, recommendations, and timeline to compliance.
 */

import type { ReportSection, ReportSectionContent } from "../types";
import type { CRAAssessmentData } from "./cra-eu-declaration";

// ─── Extended data for the summary report ───────────────────────────────────

export interface CRAComplianceSummaryData extends CRAAssessmentData {
  /** Requirement status breakdown by category */
  categoryBreakdown: Array<{
    category: string;
    categoryLabel: string;
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
  }>;
  /** NIS2 overlap information */
  nis2OverlapCount: number | null;
  nis2AssessmentId: string | null;
  /** Top gaps / non-compliant requirements */
  topGaps: Array<{
    requirementId: string;
    title: string;
    category: string;
    severity: string;
    status: string;
  }>;
  /** Existing certifications */
  certifications: {
    iec62443: boolean;
    etsiEN303645: boolean;
    commonCriteria: boolean;
    iso27001: boolean;
  };
  /** Risk level */
  riskLevel: string | null;
  /** Compliance score */
  complianceScore: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLASSIFICATION_LABELS: Record<string, string> = {
  default: "Default Category",
  class_I: "Class I (Annex III)",
  class_II: "Class II (Annex IV)",
};

const CONFORMITY_ROUTE_LABELS: Record<string, string> = {
  self_assessment: "Internal Control (Module A) — Self-Assessment",
  harmonised_standard:
    "Harmonised Standard / Third-Party Assessment (Module B+C or H)",
  third_party_type_exam:
    "EU-Type Examination (Module B) + Conformity to Type (Module C)",
  full_quality_assurance: "Full Quality Assurance (Module H)",
};

const RISK_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getComplianceLevel(score: number | null): string {
  if (score === null) return "Not Assessed";
  if (score >= 80) return "Strong Compliance Posture";
  if (score >= 60) return "Moderate Compliance Posture";
  if (score >= 40) return "Weak Compliance Posture";
  return "Critical — Significant Gaps";
}

function estimateWeeksToCompliance(
  stats: CRAAssessmentData["requirementStats"],
): string {
  const remaining = stats.nonCompliant + stats.partial;
  if (remaining === 0) return "Compliance target achieved";
  // Rough estimate: 2 weeks per non-compliant, 1 week per partial
  const weeks = stats.nonCompliant * 2 + stats.partial * 1;
  if (weeks <= 4) return `${weeks} weeks (estimated)`;
  if (weeks <= 12) return `${weeks} weeks (~${Math.ceil(weeks / 4)} months)`;
  return `${weeks} weeks (~${Math.ceil(weeks / 4)} months) — consider prioritization`;
}

// ─── Section Generator ──────────────────────────────────────────────────────

export function generateCRAComplianceSummarySections(
  data: CRAComplianceSummaryData,
): ReportSection[] {
  const classLabel =
    CLASSIFICATION_LABELS[data.productClassification] ||
    data.productClassification;
  const routeLabel =
    CONFORMITY_ROUTE_LABELS[data.conformityRoute] || data.conformityRoute;
  const riskLabel = data.riskLevel
    ? RISK_LABELS[data.riskLevel] || data.riskLevel
    : "Not assessed";
  const complianceLevel = getComplianceLevel(data.complianceScore);

  const sections: ReportSection[] = [];

  // ─── 1. Executive Summary ───

  const { total, compliant, partial, nonCompliant } = data.requirementStats;
  const notAssessed = total - compliant - partial - nonCompliant;
  const compliancePct = total > 0 ? Math.round((compliant / total) * 100) : 0;

  sections.push({
    title: "1. Executive Summary",
    content: [
      {
        type: "text",
        value: `This Compliance Summary Report presents the current CRA compliance status of "${data.productName}" as assessed against Regulation (EU) 2024/2847 (Cyber Resilience Act). The report was generated on ${formatDate(data.createdAt)}.`,
      },
      { type: "spacer", height: 4 },
      {
        type: "keyValue",
        items: [
          { key: "Product", value: data.productName },
          {
            key: "Version",
            value: data.productVersion || "Not specified",
          },
          { key: "Manufacturer", value: data.organizationName },
          { key: "Classification", value: classLabel },
          { key: "Conformity Route", value: routeLabel },
          { key: "Risk Level", value: riskLabel },
          {
            key: "Compliance Score",
            value:
              data.complianceScore !== null
                ? `${data.complianceScore}%`
                : "Not calculated",
          },
          {
            key: "Maturity Score",
            value:
              data.maturityScore !== null
                ? `${data.maturityScore}%`
                : "Not calculated",
          },
          { key: "Overall Status", value: complianceLevel },
        ],
      },
      { type: "spacer", height: 4 },
      {
        type: "table",
        headers: ["Metric", "Value"],
        rows: [
          ["Total Requirements", total.toString()],
          ["Compliant", `${compliant} (${compliancePct}%)`],
          [
            "Partially Compliant",
            `${partial} (${total > 0 ? Math.round((partial / total) * 100) : 0}%)`,
          ],
          [
            "Non-Compliant",
            `${nonCompliant} (${total > 0 ? Math.round((nonCompliant / total) * 100) : 0}%)`,
          ],
          [
            "Not Yet Assessed",
            `${notAssessed} (${total > 0 ? Math.round((notAssessed / total) * 100) : 0}%)`,
          ],
        ],
      },
      {
        type: "alert",
        severity:
          compliancePct >= 80
            ? "info"
            : compliancePct >= 50
              ? "warning"
              : "error",
        message:
          compliancePct >= 80
            ? "The product demonstrates strong compliance with CRA essential requirements."
            : compliancePct >= 50
              ? "The product has moderate compliance. Gaps must be addressed before placing on the EU market."
              : "Significant compliance gaps detected. Immediate remediation is required to achieve CRA conformity.",
      },
    ],
  });

  // ─── 2. Requirement Status by Category ───

  const catContent: ReportSectionContent[] = [
    {
      type: "text",
      value:
        "Breakdown of requirement compliance status across all CRA requirement categories:",
    },
    { type: "spacer", height: 4 },
  ];

  if (data.categoryBreakdown.length > 0) {
    catContent.push({
      type: "table",
      headers: [
        "Category",
        "Total",
        "Compliant",
        "Partial",
        "Non-Compliant",
        "Not Assessed",
      ],
      rows: data.categoryBreakdown.map((cat) => [
        cat.categoryLabel,
        cat.total.toString(),
        cat.compliant.toString(),
        cat.partial.toString(),
        cat.nonCompliant.toString(),
        cat.notAssessed.toString(),
      ]),
    });
  } else {
    catContent.push({
      type: "text",
      value: "No category breakdown data available.",
    });
  }

  sections.push({
    title: "2. Requirement Status by Category",
    content: catContent,
  });

  // ─── 3. Key Compliance Gaps ───

  const gapContent: ReportSectionContent[] = [
    {
      type: "text",
      value:
        "The following requirements have been identified as non-compliant or partially compliant and represent the most critical compliance gaps:",
    },
    { type: "spacer", height: 4 },
  ];

  if (data.topGaps.length > 0) {
    gapContent.push({
      type: "table",
      headers: ["Requirement", "Category", "Severity", "Status"],
      rows: data.topGaps
        .slice(0, 15)
        .map((gap) => [
          gap.title.length > 50 ? gap.title.slice(0, 47) + "..." : gap.title,
          gap.category,
          gap.severity,
          gap.status === "non_compliant" ? "Non-Compliant" : "Partial",
        ]),
    });

    if (data.topGaps.length > 15) {
      gapContent.push({
        type: "text",
        value: `... and ${data.topGaps.length - 15} additional gaps not shown.`,
      });
    }
  } else {
    gapContent.push({
      type: "alert",
      severity: "info",
      message:
        "No critical compliance gaps identified. All assessed requirements are currently compliant.",
    });
  }

  sections.push({
    title: "3. Key Compliance Gaps",
    content: gapContent,
  });

  // ─── 4. NIS2 Directive Overlap Analysis ───

  const nis2Content: ReportSectionContent[] = [];

  if (data.nis2OverlapCount !== null && data.nis2OverlapCount > 0) {
    nis2Content.push({
      type: "text",
      value: `The CRA assessment has identified ${data.nis2OverlapCount} requirement(s) that overlap with the NIS2 Directive (EU 2022/2555). Organizations subject to both the CRA and NIS2 should coordinate their compliance efforts to avoid duplication.`,
    });
    nis2Content.push({ type: "spacer", height: 4 });
    nis2Content.push({
      type: "keyValue",
      items: [
        {
          key: "NIS2 Overlapping Requirements",
          value: data.nis2OverlapCount.toString(),
        },
        {
          key: "Linked NIS2 Assessment",
          value: data.nis2AssessmentId || "None linked",
        },
      ],
    });
    nis2Content.push({ type: "spacer", height: 4 });
    nis2Content.push({
      type: "alert",
      severity: "info",
      message:
        "Article 13(8) CRA: Products that comply with the essential requirements of the CRA are presumed to comply with corresponding NIS2 security requirements. Consider leveraging CRA compliance evidence for NIS2 reporting.",
    });
  } else {
    nis2Content.push({
      type: "text",
      value:
        "No NIS2 overlap data is currently available for this assessment. If the manufacturer falls within the scope of the NIS2 Directive, a separate NIS2 assessment is recommended to identify overlapping obligations.",
    });
  }

  sections.push({
    title: "4. NIS2 Directive Overlap Analysis",
    content: nis2Content,
  });

  // ─── 5. Conformity Assessment Route Guidance ───

  const routeContent: ReportSectionContent[] = [
    {
      type: "keyValue",
      items: [
        { key: "Current Classification", value: classLabel },
        { key: "Assigned Route", value: routeLabel },
      ],
    },
    { type: "spacer", height: 4 },
  ];

  if (data.productClassification === "default") {
    routeContent.push({
      type: "text",
      value:
        "For Default category products, the manufacturer shall carry out an internal control procedure (Module A) as set out in Annex VIII of the CRA. This involves:",
    });
    routeContent.push({
      type: "list",
      items: [
        "Drawing up technical documentation in accordance with Article 31",
        "Ensuring the manufacturing process and monitoring ensure conformity",
        "Affixing the CE marking in accordance with Article 27",
        "Drawing up the EU declaration of conformity in accordance with Article 28",
      ],
      ordered: true,
    });
  } else if (data.productClassification === "class_I") {
    routeContent.push({
      type: "text",
      value:
        "For Class I products (Annex III), the manufacturer may choose one of the following conformity assessment routes under Article 32(3):",
    });
    routeContent.push({
      type: "list",
      items: [
        "Internal control (Module A) — if harmonised standards, common specifications, or EU cybersecurity certification schemes covering all essential requirements have been applied",
        "EU-type examination (Module B) followed by conformity to type (Module C) — Annex VIII",
        "Full quality assurance (Module H) — Annex VIII",
      ],
    });
    if (data.conformityRoute === "self_assessment") {
      routeContent.push({
        type: "alert",
        severity: "warning",
        message:
          "Self-assessment for Class I products is only permitted when harmonised standards listed in the OJEU have been fully applied. Verify that applicable harmonised standards exist and have been applied correctly.",
      });
    }
  } else if (data.productClassification === "class_II") {
    routeContent.push({
      type: "text",
      value:
        "For Class II products (Annex IV), conformity assessment must be performed through one of the following routes under Article 32(4):",
    });
    routeContent.push({
      type: "list",
      items: [
        "EU-type examination (Module B) followed by conformity to type (Module C)",
        "Full quality assurance (Module H) based on Annex VIII",
      ],
    });
    routeContent.push({
      type: "alert",
      severity: "warning",
      message:
        "Class II products require mandatory third-party assessment. A Notified Body must be engaged for the conformity assessment procedure.",
    });
  }

  // Existing certifications
  const certs: string[] = [];
  if (data.certifications.iec62443) certs.push("IEC 62443");
  if (data.certifications.etsiEN303645) certs.push("ETSI EN 303 645");
  if (data.certifications.commonCriteria)
    certs.push("Common Criteria (ISO/IEC 15408)");
  if (data.certifications.iso27001) certs.push("ISO/IEC 27001");

  if (certs.length > 0) {
    routeContent.push({ type: "spacer", height: 4 });
    routeContent.push({
      type: "heading",
      value: "Existing Certifications",
      level: 2,
    });
    routeContent.push({
      type: "text",
      value: `The following existing certifications may support the conformity assessment and provide presumption of conformity for applicable requirements:`,
    });
    routeContent.push({
      type: "list",
      items: certs,
    });
  }

  sections.push({
    title: "5. Conformity Assessment Route Guidance",
    content: routeContent,
  });

  // ─── 6. Recommendations & Next Steps ───

  const recommendations: string[] = [];

  if (nonCompliant > 0) {
    recommendations.push(
      `Address ${nonCompliant} non-compliant requirement(s) as a priority. Focus on mandatory/critical severity items first.`,
    );
  }
  if (partial > 0) {
    recommendations.push(
      `Complete implementation of ${partial} partially compliant requirement(s) to achieve full conformity.`,
    );
  }
  if (notAssessed > 0) {
    recommendations.push(
      `Assess the remaining ${notAssessed} requirement(s) that have not yet been evaluated.`,
    );
  }
  if (
    data.productClassification !== "default" &&
    (data.conformityRoute === "third_party_type_exam" ||
      data.conformityRoute === "full_quality_assurance")
  ) {
    recommendations.push(
      "Engage a Notified Body for the required third-party conformity assessment procedure.",
    );
  }
  if (
    data.nis2OverlapCount &&
    data.nis2OverlapCount > 0 &&
    !data.nis2AssessmentId
  ) {
    recommendations.push(
      "Consider linking or performing a NIS2 assessment to leverage CRA compliance evidence for NIS2 obligations.",
    );
  }
  recommendations.push(
    "Prepare technical documentation in accordance with Article 31 of the CRA.",
  );
  recommendations.push(
    "Generate and sign the EU Declaration of Conformity (Article 28) once all essential requirements are met.",
  );
  recommendations.push(
    "Establish a vulnerability handling process for post-market monitoring (Annex I, Part II).",
  );
  recommendations.push(
    "Define the support period for the product and communicate it to users (Article 13(16)).",
  );

  sections.push({
    title: "6. Recommendations & Next Steps",
    content: [
      {
        type: "text",
        value:
          "Based on the current assessment status, the following actions are recommended to achieve full CRA compliance:",
      },
      { type: "spacer", height: 4 },
      {
        type: "list",
        items: recommendations,
        ordered: true,
      },
    ],
  });

  // ─── 7. Timeline to Compliance ───

  const timelineEstimate = estimateWeeksToCompliance(data.requirementStats);

  sections.push({
    title: "7. Timeline to Compliance",
    content: [
      {
        type: "keyValue",
        items: [
          {
            key: "Estimated Time to Full Compliance",
            value: timelineEstimate,
          },
          {
            key: "CRA Application Date",
            value:
              "11 December 2027 (full application of essential requirements)",
          },
          {
            key: "Reporting Obligations Start",
            value: "11 September 2026 (vulnerability and incident reporting)",
          },
        ],
      },
      { type: "spacer", height: 4 },
      {
        type: "text",
        value:
          "The timeline estimate is based on an average implementation effort per requirement. Actual timelines depend on organizational capacity, existing controls, and product complexity. Early engagement with the compliance process is strongly recommended given the CRA's phased application dates.",
      },
      { type: "spacer", height: 8 },
      { type: "divider" },
      { type: "spacer", height: 4 },
      {
        type: "alert",
        severity: "info",
        message:
          "This report was generated by Caelex Compliance Platform for assessment and planning purposes. It does not constitute legal advice. Consult qualified legal counsel for formal regulatory guidance.",
      },
      { type: "spacer", height: 4 },
      {
        type: "keyValue",
        items: [
          { key: "Generated By", value: "Caelex Compliance Platform" },
          { key: "Report Date", value: formatDate(data.createdAt) },
          { key: "Organization", value: data.organizationName },
        ],
      },
    ],
  });

  return sections;
}
